# imap-forwarder
A quick and dirty app to periodically forward messages from an imap box to an arbitrary address using mailgun
# Configuration

Expects keys.json to exist with this format:

    {"mailgun":"key-XXXXXXXXXXXXXX",
     "user":"from@email.com",
     "pass":"imap-password",
     "lastmessage":0, // Initially, updated to keep track of the last messages forwarded
     "target":"mail.test@gmail.com", // Wherever to send mail
     "box":"Trades" // The IMAP box to select
     }
