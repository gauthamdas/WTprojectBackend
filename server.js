require('dotenv').config();

const express = require('express');
const app = express();
const http = require('http');
const axios = require('axios');
const bodyParser = require('body-parser'); 
const cors = require('cors');
const appRoutes = express.Router();
const operations = require('./operations');
const PORT = process.env.PORT || 4000;
// const io = require("socket.io")(4001 , {cors: {origin: '*',}});
///
const { Server } = require("socket.io");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
/// 
io.on("connection", (socket) => {
  global.socket = socket;
  global.socketToken="";
  socket.on("auth",data=>{ 
    socketToken = data.token;
    console.log(socket.id) 
    operations.setSocketId(socketToken,socket.id);
  });
  /////
  socket.on("test",data => {
    socket.emit("payment_notification",{transaction_id: "123123", amt: "389", from_name: data});
    
    // socket.emit("payment_notification",{transaction_id: "123128", amt: "89", from_name: "Robert Downey Jr"});
    
    // socket.emit("payment_notification",{transaction_id: "123173", amt: "78", from_name: "Tom Cruise"});
  });
 
  // io.to("a").emit("payment_notification","paid2");
  // io.sockets.in("a").emit("payment_notification","paid3");

  socket.on("disconnect",data => {
    operations.removeSocketId(socketToken,socket.id);
    console.log("user disconnected "+socket.id)
  }); 
  // console.log(io.sockets.adapter.rooms)
});

app.use(cors());
app.use(bodyParser.json());
app.use(
    express.urlencoded({
      extended: true
    })
  )  

app.use('/', appRoutes);


appRoutes.route('/').get((req,res)=>{
    res.send('Hello')
}) 

appRoutes.route('/verifyToken').get(async (req,res)=>{
  var token =  req.query.token;
  if (!token) {
    return res.status(400).json({
      error: true,
      message: "Token is required."
    });
  }
  // check token that was stored
  let check = await operations.verifyTok(token);
    if (!check.auth){
        return res.status(401).json({
        error: true,
        message: "Invalid token."
    });
    }
   
    // get basic user details
    var userObj = await operations.getCleanUser({username:check.username});
    return res.json({ user: userObj, token });
   
}) 

appRoutes.route('/users/signin').post(async (req,res)=>{
    const user = req.body.username;
    const pwd = req.body.password;
    
    // return 400 status if username/password does not exist
    if (!user || !pwd) {
        return res.status(400).json({
        error: true,
        message: "Username or Password required."
        });
    }

     //get password for the user
    const userData = await operations.checkUser(user)
    // return 401 status if the credential is not match.
    if (user !== userData.username || pwd !== userData.password) {
        return res.status(401).json({
        error: true,
        message: "Username or Password is Wrong."
        });
    }
    
    // generate token
    const token = operations.generateToken(userData);
    // get basic user details
    const userObj = await operations.getCleanUser({username:userData.username});
    // store token of current user
    operations.storeTok(token,userData.username)
    // return the token along with user details
    return res.json({ user: userObj, token });

})

//get Balance of requested user
appRoutes.route('/users/fetchBalance').post(async (req,res)=>{
  const token = req.body.token;
  let check = await operations.verifyTok(token);
  if (!check.auth) {
    return res.status(401).json({
    error: true,
    message: "Unauthorised Access"
    });
  }
  
  //fetch balance from database
  let Balance = await operations.fetchBalance({username: check.username});

  return res.json({ balance: Balance });
}) 

//set telegram communication
appRoutes.route('/users/activation').post(async (req,res)=>{
  const token = req.body.token;
  const tele_user = req.body.tele_username;
  const ChatId = req.body.chat_id;
  
  // return 401 status if username/chat id does not exist
  if (!tele_user || !ChatId) {
      return res.status(401).json({
      error: true,
      message: "Username or Chat Id required."
      });
  }

   //get username for the user
   let check = await operations.verifyTok(token);
   if (!check.auth) {
     return res.status(401).json({
     error: true,
     message: "Unauthorised Access"
     });
   }
  
  //get username of user by sending a confirmation message
  let msg = 'You are subscribed for message updates ';
  let result = await axios.get(`https://api.telegram.org/bot2062096906:AAEEh4TA4p8GiZQg2dUcVa5VXBaHVgcETUw/sendMessage?chat_id=${ChatId}&text=${msg}`);
  console.log(result.data.result.chat.username,tele_user)
  if (result.data.result.chat.username != tele_user ){
    return res.status(401).json({
    error: true,
    message: "Invalid Details"
    });
  }
  await operations.setTeleDetails(check.username,ChatId,tele_user);

  return res.json({ auth: true });
})

appRoutes.route('/upi/payment').post(async function(req,res){
  const token = req.body.token;
  const recp_upi_id = req.body.upi_id;
  const upi_pin = req.body.upi_pin;
  const transferAmt = req.body.amt;
  let check = await operations.verifyTok(token);
  if (!check.auth) {
    return res.status(401).json({
    error: true,
    message: "Unauthorised Access"
    });
  }
  const authData = await operations.getAuthData({username: check.username, upi_pin: upi_pin})
  if (!authData.auth) {
    return res.status(401).json({
    error: true,
    message: "Invalid PIN"
    });
  }
  
  const recpData = await operations.getRecpData({upi_id: recp_upi_id})
  if (!recpData.auth) {
    return res.status(401).json({
    error: true,
    message: "Invalid Recipient"
    });
  }

  //check for enough balance
  if (parseInt(authData.userBal)<parseInt(transferAmt)) {
    return res.status(401).json({
    error: true,
    message: "Insufficient Balance"
    });
  }

  //Update user balance
  operations.updateUserBalance({amt: (parseInt(authData.userBal)-parseInt(transferAmt)), userUpi: authData.userUpi});
  //update recipient balance
  operations.updateRecpBalance({amt: (parseInt(recpData.recpBal)+parseInt(transferAmt)), recpUpi: recp_upi_id});
  //Get transaction id
  const transactionId = await operations.getTransactionId();
  //get current timestamp
  const paymentTimeStamp = new Date().toLocaleString();
  //send a notification if user is online
  const recpSocId = await operations.getRecpSocketId(recpData.username);
  // console.log(io.sockets.adapter.rooms)
  await io.to(recpSocId.socket_id).emit("payment_notification",{transaction_id: transactionId, amt: transferAmt, from_upi: authData.userUpi, from_ac: authData.userAcNum, to_upi: recp_upi_id, to_ac: recpData.recpAcNum, from_name: authData.name, to_name: recpData.name, time: paymentTimeStamp, mode: "UPI", type: "credit"});
  //update user history
  operations.updateUserHistory({transaction_id: transactionId, amt: transferAmt, from_upi: authData.userUpi, from_ac: authData.userAcNum, to_upi: recp_upi_id, to_ac: recpData.recpAcNum, from_name: authData.name, to_name: recpData.name, time: paymentTimeStamp, mode: "UPI", type: "debit"});
  //update recipient history
  operations.updateRecpHistory({transaction_id: transactionId, amt: transferAmt, from_upi: authData.userUpi, from_ac: authData.userAcNum, to_upi: recp_upi_id, to_ac: recpData.recpAcNum, from_name: authData.name, to_name: recpData.name, time: paymentTimeStamp, mode: "UPI", type: "credit"});
  //store payment log
  operations.updateHistory({transaction_id: transactionId, amt: transferAmt, from_upi: authData.userUpi, from_ac: authData.userAcNum, to_upi: recp_upi_id, to_ac: recpData.recpAcNum, from_name: authData.name, to_name: recpData.name, time: paymentTimeStamp, mode: "UPI"})
  //send message to user
  let userChtId = await operations.fetchDetails({username: check.username});
  let userMsg = `${transferAmt} has been debited from your account`;
  if (userChtId.status)
  axios.get(`https://api.telegram.org/bot2062096906:AAEEh4TA4p8GiZQg2dUcVa5VXBaHVgcETUw/sendMessage?chat_id=${userChtId.chat_id}&text=${userMsg}`);
  //send message to recipient
  let recpChtId = await operations.fetchDetails({username: recpData.username})
  let recpMsg = `${transferAmt} has been credited to your account`;
  if (recpChtId.status)
  axios.get(`https://api.telegram.org/bot2062096906:AAEEh4TA4p8GiZQg2dUcVa5VXBaHVgcETUw/sendMessage?chat_id=${recpChtId.chat_id}&text=${recpMsg}`)
  // return the token along with user details
  return res.json({ flag: true, amt: transferAmt, transId: transactionId, to_upi: recp_upi_id , to_name: recpData.name});
})

//get transaction history of requested user
appRoutes.route('/users/history').post(async (req,res)=>{
  const token = req.body.token;
  let check = await operations.verifyTok(token);
  if (!check.auth) {
    return res.status(401).json({
    error: true,
    message: "Unauthorised Access"
    });
  }
  
  //fetch history from database
  let history = await operations.fetchHistory({username: check.username});

  return res.json({ transHistory: history });
}) 

//get account details of requested user
appRoutes.route('/users/acdetails').post(async (req,res)=>{
  const token = req.body.token;
  let check = await operations.verifyTok(token);
  if (!check.auth) {
    return res.status(401).json({
    error: true,
    message: "Unauthorised Access"
    });
  }
  
  //fetch details from database
  let details = await operations.fetchDetails({username: check.username});

  return res.json(details);
})

app.listen(PORT, function() {
    console.log("Server is running on Port: " + PORT);
});
server.listen(4001, () => {
  console.log("SERVER RUNNING");
});