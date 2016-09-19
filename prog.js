var q = require('q');
var qio = require('q-io/fs');
var mailgun = require('mailgun-js');
var imapclient = require('emailjs-imap-client');
var AsyncPolling = require('async-polling');

AsyncPolling(function(end) {
    qio.read('keys.json').
        then(JSON.parse).
        then(function(keys) {
            var imap = new imapclient("imap.gmail.com", 993, { auth: {user: keys.user, pass: keys.pass} });
            return imap.connect().then(function() {
                return {keys: keys, imap: imap}; 
            });
        }).
        then(function(kim) {
            return kim.imap.selectMailbox(kim.keys.box).
                then(function() { 
                    console.log('selected mailbox ' + kim.keys.box);
                    return kim;
                });
        }).
        then(function(kim) {
            var range = 
                kim.keys.lastmessage ? kim.keys.lastmessage : 1;
            return kim.imap.listMessages(kim.keys.box, '' + range + ':*', ['uid','flags','body[]'], {byUid: true}).then(function(messages) {
                var result = {
                    keys: kim.keys,
                    imap: kim.imap,
                    mailboxes: kim.mailboxes,
                    messages: messages
                };
                return result;
            });
            console.log("didn't find " + kim.keys.box + " mailbox");
            kim.error = 'Trade mailbox not found';
            throw kimb;
        }).
        then(function(kim) {
            var messages = kim.messages;
            var uid = kim.keys.lastmessage;
            for (var i = 0; i < messages.length; i++) {
                var message = messages[i];
                if (message.uid >= uid) {
                    uid = message.uid + 1;
                    var body = message['body[]'].split('\n');
                    var trade = { };
                    for (var j = 0; j < body.length; j++) {
                        var line = body[j].trim();
                        var k = line.split(':');
                        if (k.length != 2) {
                            continue;
                        }
                        if (k[0] == 'Trade Type') {
                            trade['type'] = k[1].trim();
                        } else if (k[0] == 'Security Symbol') {
                            trade['symbol'] = k[1].trim();
                        } else if (k[0] == 'Quantity') {
                            trade['quantity'] = k[1].trim();
                        }
                    }
                    console.log('trade',trade);
                    var mginstance = mailgun({apiKey: kim.keys.mailgun, domain: 'mg.superheterodyne.net'});
                    var data = {
                        from: "art.yerkes@gmail.com",
                        to: kim.keys.target,
                        subject: "Trade notification",
                        text: 'TRADE: ' + trade['type'] + ' ' + trade['symbol'] + ' ' + trade['quantity']
                    };
                    var df = q.defer();
                    mginstance.messages().send(data, function(error, body) {
                        if (error) {
                            console.log('error',error);
                            df.reject(error);
                        } else {
                            console.log('body',body);
                            df.resolve(body);
                        }
                        return df.promise;
                    });
                }
            }
            kim.keys.lastmessage = uid;
            return qio.write('keys.json',JSON.stringify(kim.keys)).
                then(function() { return kim; });
        }).
        then(function(kim) {
            console.log('close');
            if (kim) {
                kim.imap.close();
            }
        }).
        catch(function(kim) {
            console.log('error ' + kim.error ? kim.error : kim);
            if (kim.error) {
                if (kim.imap) {
                    kim.imap.close();
                }
            }
            return null;
        }).
        then(function() {
            end();
        }).
        done();
}, 30 * 1000).run();
