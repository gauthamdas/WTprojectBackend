// generate token using secret from process.env.jwtTok
const jwt = require('jsonwebtoken');
const MongoClient = require('mongodb').MongoClient
let ConnectionURL = "mongodb://localhost:27017/bank";
// generate token and return it
function generateToken(user) {
  if (!user) return null;
 
  var u = {
    username: user.username,
    password: user.password
  };
 
  return jwt.sign(u, process.env.jwtTok, {
    expiresIn: 1 // expires in 24 hours
  });
}
 
// return basic user details
async function getCleanUser(user) {
  if (!user) return null;
  this.res=[]
    const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    res = await db.collection("profile").find({username: user.username}).toArray();
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
  if (res[0])
    return {name: res[0].first_name+' '+res[0].last_name, username: user}
  else
    return {name: null, username: null}
  // return {
  //   name: "Gautham",
  //   username: user.username,
  // };
}
 
// verify token
async function verifyTok(token) {
  this.res=[]
    const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    res = await db.collection("sessions").find({token:token}).toArray();
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
  if (res[0])
    return {auth:true,username:res[0].username}
  else
    return {auth:false,username:res[0]}

}

//check user for password
async function checkUser(user) {
  this.res=[]
    const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    res = await db.collection("credentials").find({username:user}).toArray();
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
  if (res[0])
    return {username: res[0].username, password: res[0].password}
  else
    return {username: "", password: ""}

}

//store token
async function storeTok(token,user) {
  this.res=[]
    const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    var query = {username:user}
    var newvalues = { $set: {token: token } };
    await db.collection("sessions").updateOne(query,newvalues);
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
}

//set Socket ID
async function setSocketId(token,socId) {
  // console.log(token,socId)
  this.res=[]
    const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    var query = {token: token}
    var newvalues = { $set: {socketId: socId }};
    await db.collection("sessions").updateOne(query,newvalues);
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
}

//remove Socket ID
async function removeSocketId(token,socId) {
  this.res=[]
    const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    var query = {token: token}
    var newvalues = { $set: {socketId: null }};
    await db.collection("sessions").updateOne(query,newvalues);
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
}

//get Balance of user
async function fetchBalance(data){
  this.res=[]
  const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    res = await db.collection("accounts").find(data).toArray();
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
   if (res[0])
    return res[0].balance
  else
    return 0
}

//update telegram details
async function setTeleDetails(username,chatid,teleUser) {
  this.res=[]
    const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    var query = {username: username}
    var newvalues = { $set: {chat_id: chatid, tele_username: teleUser, status: true } };
    await db.collection("profile").updateOne(query,newvalues);
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
}

//get Upi data
async function getAuthData(data){
  this.res=[]
  const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    res = await db.collection("accounts").find(data).toArray();
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
   if (res[0])
    return {auth:true, userUpi: res[0].upi_id, userBal: res[0].balance, userAcNum: res[0].ac_number, name: res[0].name, chat_id: res[0].chat_id}
  else
    return {auth:false}
}

//get Recipient Data
async function getRecpData(data){
  this.res=[]
  const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    res = await db.collection("accounts").find(data).toArray();
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
   if (res[0])
    return {auth:true, recpBal: res[0].balance, recpAcNum: res[0].ac_number, name: res[0].name, username: res[0].username, chat_id: res[0].chat_id }
  else
    return {auth:false}
}

//update user balance
async function updateUserBalance(data) {
  this.res=[]
    const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    var query = {upi_id:data.userUpi}
    var newvalues = { $set: {balance: data.amt} };
    await db.collection("accounts").updateOne(query,newvalues);
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
}

//update Recipient balance
async function updateRecpBalance(data) {
  this.res=[]
    const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    var query = {upi_id:data.recpUpi}
    var newvalues = { $set: {balance: data.amt} };
    await db.collection("accounts").updateOne(query,newvalues);
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
}

//get next transaction Id
async function getTransactionId(){
  this.res=[]
  const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    res = await db.collection("transactions").find().sort({transaction_id: -1}).limit(1).toArray();
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
   if (res[0])
    return parseInt(res[0].transaction_id)+1;
  else
    return 137656;
}

// get rcipient socket id
async function getRecpSocketId(username) {
  this.res=[]
    const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    res = await db.collection("sessions").find({username: username}).toArray();
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
  if (res[0])
    return {auth:true, socket_id:res[0].socketId}
  else
    return {auth:false, socket_id:res[0]}
}

//update user History
async function updateUserHistory(data) {
  this.res=[]
    const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    await db.collection("user_transactions").updateOne({ac_number: data.from_ac}, {$push: {history: data}});
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
}

//update Recipient History
async function updateRecpHistory(data) {
  this.res=[]
    const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    await db.collection("user_transactions").updateOne({ac_number: data.to_ac}, {$push: {history: data}});
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
}

//get history of user
async function fetchHistory(data){
  this.res=[]
  const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    res = await db.collection("user_transactions").find(data).toArray();
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
   if (res[0])
    return res[0].history
  else
    return null
}

//get details of user
async function fetchDetails(data){
  this.res=[]
  const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    res = await db.collection("profile").find(data).toArray();
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
   if (res[0])
    return res[0]
  else
    return null
}

//update Transaction History
async function updateHistory(data) {
  this.res=[]
    const client = await  MongoClient.connect(ConnectionURL)
   try {
    db = client.db('bank')
    await db.collection("transactions").insertOne(data);
   } catch (err) {
    throw err
   } finally {
     client.close()
   }
}

module.exports = {
  generateToken,
  getCleanUser,
  verifyTok,
  fetchBalance,
  checkUser,
  storeTok,
  setSocketId,
  removeSocketId,
  setTeleDetails,
  getAuthData,
  getRecpData,
  updateUserBalance,
  updateRecpBalance,
  getTransactionId,
  getRecpSocketId,
  updateUserHistory,
  updateRecpHistory,
  fetchHistory,
  fetchDetails,
  updateHistory,

}