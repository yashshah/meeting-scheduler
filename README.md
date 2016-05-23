#Scheduling meetings around the world just got easy

Have you ever been here? You need to set up a meeting with a customer in Tokyo, the dev team in India or your boss, who happens to be traveling in Brazil. You Google their time zones, schedule the call and pat yourself on the back for handling it all so efficiently… until you realize you miscalculated and your company CEO is stuck on a 2am call.

The details may change, but for those of us who schedule international meetings frequently, the realities are all too familiar. It happened to me too many times, so I decided to write this integration for the best tool for email I've ever encountered. Checkout Mixmax [here](http://mixmax.com)

This integration handles scheduling meetings in different timezone efficiently. With one command scheduling, you can book meetings in one email instead of ten. Your just have to select the attendee's city, and integration will do the rest. No more back and forth.


![alt tag](http://g.recordit.co/94JvhQ91M7.gif)  

## Running locally
Install the node packages by running following command:
```
npm install
```   

Start the node.js server:
```
npm start
```    

Run the following command to fix the https issue locally:    
```
openssl genrsa -des3 -out server.enc.key 1024
openssl req -new -key server.enc.key -out server.csr
openssl rsa -in server.enc.key -out server.key
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
```    
More information [here](http://www.sitepoint.com/how-to-use-ssltls-with-node-js/)     

## Roadmap
* Multiple attendee option
* Using promises instead of Callbacks
* Release npm package