const app = require('express')()
const moltinGateway = require('@moltin/sdk').gateway
const bodyParser = require('body-parser')
const request = require('request')
const dotenv = require('dotenv').config()
const querystring = require('querystring')

const Moltin = moltinGateway({
  client_id: process.env.MOLTIN_CLIENT_ID,
  client_secret: process.env.MOLTIN_CLIENT_SECRET
})

const port = process.env.PORT || 3000
const sandbox = process.env.PAYPAL_ENVIRONMENT == 'sandbox' ? true : false
const paypalEmail = sandbox ? process.env.PAYPAL_SANDBOX_EMAIL : process.env.PAYPAL_LIVE_EMAIL
const PRODUCTION_VERIFY_URI = 'https://ipnpb.paypal.com/cgi-bin/webscr'
const SANDBOX_VERIFY_URI = 'https://ipnpb.sandbox.paypal.com/cgi-bin/webscr'

function getPaypalURI() {
  return sandbox ? SANDBOX_VERIFY_URI : PRODUCTION_VERIFY_URI;
}

function sendVerificationRequest(ipnTransactionMessage) {
  if (sandbox !== Boolean(ipnTransactionMessage.test_ipn)) {
    const modeState = sandbox ? 'enabled' : 'disabled';
    const ipnEnv = sandbox ? 'sandbox' : 'live';
    console.error(
      `Sandbox mode is ${modeState}, cannot handle ${ipnEnv} IPNs.`
    )
  } else {
    const formUrlEncodedBody = querystring.stringify(ipnTransactionMessage)
    const verificationBody = `cmd=_notify-validate&${formUrlEncodedBody}`

    let options = {
      method: 'POST',
      uri: getPaypalURI(),
      body: verificationBody,
    }

    request(options, function callback(error, response, body) {
      if (!error && response.statusCode == 200) {
        // Check the response body for validation results.
        if (body === "VERIFIED") {
          console.log(
            `Verified IPN: IPN message for Transaction ID: ${ipnTransactionMessage.txn_id} is verified.`
          )
          const postedStatus = ipnTransactionMessage.payment_status
          const postedEmail = ipnTransactionMessage.receiver_email
          if (postedStatus == 'Completed' && postedEmail == paypalEmail) {
            notifyMoltin(ipnTransactionMessage)
            saveTxnId(ipnTransactionMessage)
          } else {
            // Error occured while verifying the posted data.
            console.error(
              `Moltin could not be updated. Status: ${postedStatus}, eMail: ${postedEmail}`
            )
          }
        } else if (body === "INVALID") {
          console.error(
            `Invalid IPN: IPN message for Transaction ID: ${ipnTransactionMessage.txn_id} is invalid.`
          )
        } else {
          console.error("Unexpected reponse body.")
        }
      } else {
        // Error occured while posting to PayPal.
        console.error(error);
        console.log(body);
      }
    })
  }
}

function notifyMoltin(ipnTransactionMessage) {
  const moltinOrderID = ipnTransactionMessage.invoice
  let total = ipnTransactionMessage.mc_gross

  Moltin.Transactions.All({ order: moltinOrderID }).then(async (response) => {

    // Get transactions
    const transactions = response.data 

    //Filter transactions
    let transaction = await transactions.find(function (tr) { 
      let amount = tr.amount / 100
      return amount.toFixed(2) === total
    })

    // Capture transaction
    Moltin.Transactions.Capture({ order: moltinOrderID, transaction: transaction.id }).then((response) => {
      console.log(
        `Transaction captured: ${transaction.id}.`
      )
    }).catch ((error) => {
      console.error(error)
    })
  }).catch ((error) => {
    console.error(error)
  })
}

function saveTxnId(ipnTransactionMessage) {
  const moltinOrderID = ipnTransactionMessage.invoice
  const paypalTxnID = ipnTransactionMessage.txn_id

  const data = {
    'txn_id': paypalTxnID
  }

  Moltin.Flows.UpdateEntry('orders', moltinOrderID, data).then(entry => {
    console.log(
        `Transaction ID saved: ${paypalTxnID}.`
      )
  }).catch ((error) => {
    console.error(error)
  })
}

app.use(bodyParser.urlencoded({
    extended: true
}))

app.post('/', function (req, res) {
  
  const ipnTransactionMessage = req.body

  res.sendStatus(200) // Send initial empty response to PayPal
  sendVerificationRequest(ipnTransactionMessage)

})

app.listen(port, function () {
  console.log(`Listening on port ${port}`)
})

