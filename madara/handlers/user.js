// required modules
var mongoose    = require('mongoose');
var logger    = 	require('log4js').getLogger();

// required models
var Login       = mongoose.model('Login');
var User        = mongoose.model('User');
var Session     = mongoose.model('Session');
var Log         = mongoose.model('Log');
var Bet         = mongoose.model('Bet');
var Tv          = require('../models/tv');
var userInfo = {};



module.exports.getReheshUser = function(io, socket, request){

  if(!request) return;
  if(!request.user) return;
  logger.info("getUser: request="+JSON.stringify(request));
 
  if(request.user.details.role == 'user'){
     
    User.findOne({username:request.user.details.username}, function(err, dbUser){
      if(err) logger.error(err);
      console.log(dbUser);
      socket.emit('get-user-wheel-success',dbUser);
    });
  }
  if(request.user.details.role == 'partner'){
    if(!request.filter) request['filter'] = {username:request.user.details.username, role:'partner', deleted:false};
    if(!request.filter) return;
    User.findOne(request.filter, function(err, user){
      if(err) logger.error(err);
      socket.emit('get-user-success', user);
    });
  }
  if(request.user.details.role == 'manager'){
    if(!request.filter) request['filter'] = {username:request.user.details.username, role:'manager', deleted:false};
    if(!request.filter) return;
    User.findOne(request.filter, function(err, user){
      if(err) logger.error(err);
      socket.emit('get-user-success', user);
    });
  }
  if(request.user.details.role == 'admin'){
    if(!request.filter) request['filter'] = {username:request.user.details.username, role:'admin', deleted:false};
    if(!request.filter) return;
    User.findOne(request.filter, function(err, user){
      if(err) logger.error(err);
      socket.emit('get-user-success', user);
    });
  }
}


module.exports.getUserPermission = function(io, socket, request){
  // Validate request data
  if(request)
    User.findOne({username:request.user.details.manager}, function(err, user){ 
      
    var arr=   user.availableEventTypes;

      
    socket.emit('get-user-permission-success',arr.indexOf("20"));
  });
};

module.exports.loginStatus = function(io, socket, request, access){
  // validate request data
  if(!request || !access) return;
  if(!request.user) return;
  if(!request.user.details) return;
  if(!request.user.details.username) return;
  if(!request.user.details.manager) return;

  logger.info("loginStatus: "+JSON.stringify(request));

  // Check for valid user
  var roles = [access.role];
  if(access.role2) roles.unshift(access.role2)
  Login.findOne({_id:request.user._id, role:{$in:roles}, hash:request.user.key, status:'active', deleted:false}, function(err, user){
    if(err) logger.debug(err);
    if(!user){
      socket.emit('get-user-details-error', {message:'Invalid user.', error:true});
      return;
    }
    // Check for existing session
    Session.findOne({username:request.user.details.username, manager:request.user.details.manager, role:request.user.details.role}, function(err, userSession){
      if(err) logger.debug(err);
      if(userSession){
        if(userSession.headers['user-agent'] == socket.handshake.headers['user-agent']){
          userSession.socket = socket.id;
          userSession.online = true;
          userSession.save(function(err){
            if(err) logger.error(err);
          });
          User.findOne({username:request.user.details.username, manager:request.user.details.manager}, function(err, userDetails){
            if(err) logger.debug(err);
            if(!userDetails) {
              socket.emit('get-user-details-error', {message:'Invalid user.', error:true});
              return;
            }
            else{
              socket.emit("get-user-details-success", {userDetails:userDetails});
            }
          });
        }
        else{
          io.self.to(userSession.socket).emit('session-expired',{session:userSession});
          userSession.socket = socket.id;
          userSession.headers = socket.handshake.headers;
          userSession.online = true;
          userSession.lastLogin = new Date();
          userSession.save(function(err, updatedSession){});
          logger.warn(request.user.details.username+' is trying to login from multiple places.');
          socket.emit('multiple-login', {session:userSession});
          return;
        }
      }
      else{
        logger.warn(request.user.details.username+' no session found. Requesting to login again.');
        socket.emit('session-expired', {session:userSession});
        return;
      }
    });
    logger.info('login-status: '+request.user.details.username+' reconnected.');
  });
};
module.exports.getTvs = function(io, socket, request){
  // Validate request data
  if(request)
    Tv.findOne({name:"api"}, function(err, tv){ 
      console.log(tv);
    socket.emit('get-tv-success',tv);
  });
};

module.exports.login = function(io, socket, request) {
  // Validate request data
  if(!request) return;
  if(!request.user) return;
  if(!request.user.username) return;
  if(!request.user.password) return;

  logger.info("login: "+JSON.stringify(request));

  var output = {};
  Login.findOne({username:request.user.username}, function(err, user){
    if(err) logger.debug(err);
    // Check username
    if(!user){
      logger.error('login-error: User not found '+request.user.username);
      socket.emit('login-error', {"message":"User not found", error:true});
      return;
    }
    // Check password
    if(!user.validPassword(request.user.password)){
      user.loginAttempts += 1;
      // Block the account if login attemps are greater than 5
      if(user.loginAttempts > 5){
        user.status = 'blocked';
        user.save(function(err, updatedUser){
          if(err) logger.debug(err);
        });
        // Todo: send notification to manager about this

        logger.error('login-error: Login attempts exceeded 5. Blocking the account. Invalid password '+request.user.username);
        socket.emit('login-error', {"message":"Invalid password. Invalid login attempts exceeded the limit. Your account is blocked. Please contact admin.", error:true});
        return;
      }
      user.save(function(err, updatedUser){
        if(err) logger.debug(err);
      });
      logger.error('login-error: Invalid password '+request.user.username);
      socket.emit('login-error', {"message":"Invalid password", error:true});
      return;
    }
    // Reset login attempts counter
    user.loginAttempts = 0;
    user.save(function(err, updatedUser){});

    // Check deleted or blocked account
    if(user.status != 'active'){
      logger.error('login-error: Account is blocked or deleted'+request.user.username);
      socket.emit('login-error', {"message":"Account is not accessible anymore. Contact the admin to activate the account.", error:true});
      return;
    }
    logger.info('login: '+user.username+' logged in.');
    // Send user details to client
    User.findOne({username:user.username, manager:user.manager}, function(err, userDetails){
      if(err || !userDetails){
        logger.error('login: DBError in finding user details.');
        return;
      }
      output._id = user._id;
      output.key = user.hash;
      output.details = userDetails;
      socket.emit("login-success", {output:output});
      // Todo: send updated active users to manager and admin
      // Delete existing session and create new one
      Session.findOne({username:user.username, manager:user.manager}, function(err, session){
        if(err) logger.debug(err);
        if(!session){
          // Create new session
          var newSession = new Session();
          newSession.socket = socket.id;
          newSession.username = user.username;
          newSession.role = user.role;
          newSession.manager = user.manager;
          newSession.image = userDetails.image;
          newSession.headers = socket.handshake.headers;
          newSession.lastLogin = new Date();
          newSession.online = true;
          newSession.save(function(err, newUpdatedSession){
            if(err) logger.debug(err);
          });
        }
        else{
          // Send session updating notification
          io.self.to(session.socket).emit('session-expired',{session:session});
          socket.emit('multiple-login',{session:session});

          // Update session
          session.socket = socket.id;
          session.headers = socket.handshake.headers;
          session.lastLogin = new Date();
          session.save(function(err, updatedSession){
            if(err){
              logger.error(err);
            }
          });
        }
      });
    });
  });
};

module.exports.logout = function(io, socket, request){
  // Validate request data
  if(request)
    if(request.user)
      if(request.user.details)
        logger.info(request.user.details.username+' logged out');
        // Todo: send updated activer users to manager and admin

  // Delete Session
  Session.remove({socket: socket.id}, function(err, data){
    if(err) logger.error(err);
    socket.emit('logout');
  });
};

module.exports.updatePassword = function(io, socket, request) {
  if(!request) return;
  if(!request.user || !request.password) return;
  if(request.password == '') return;

  logger.info("updatePassword: "+JSON.stringify(request));
  Login.findOne({username:request.user.details.username, role:request.user.details.role, hash:request.user.key, deleted:false, status:'active'}, function(err, dbUser){
    if(err) logger.debug(err);
    if(!dbUser){
      logger.error("Invalid Access: "+JSON.stringify(request));
      socket.emit('logout');
      return;
    }
    if(!request.targetUser){
      var login = new Login();
      login.setPassword(request.password);
      dbUser.hash = login.hash;
      dbUser.salt = login.salt;
      dbUser.save(function(err, updatedLogin){
        if(err) logger.error(err);
        socket.emit("update-password-success",{"message": "Password changed successfully.", error:false});
         Session.remove({username:request.user.details.username}, function(err, data){
          socket.emit('logout');
        });
      });
    }
    else{
      if(request.user.details.role == 'admin'){
        if(request.targetUser.role == 'admin') return;
        Login.findOne({username:request.targetUser.username, role:request.targetUser.role, deleted:false}, function(err, result){
          if(err) logger.error(err);
          if(!result){
            socket.emit("update-password-error",{"message": "User not found. Please try again.", error:true});
            return;
          }
          var login = new Login();
          login.setPassword(request.password);
          result.hash = login.hash;
          result.salt = login.salt;
          result.save(function(err, updatedLogin){
            if(err) logger.error(err);
            socket.emit("update-password-success", {"message": "Password changed successfully.", error:false});
            Session.remove({username:request.targetUser.username});
          });
        });

      }
      if(request.user.details.role == 'manager'){
        if(request.targetUser.role != 'user' && request.targetUser.role != 'partner') return;
        Login.findOne({hash:request.user.key, username:request.user.details.username, role:'manager', deleted:false, status:'active'}, function(err, dbAdmin){
          if(err) logger.error(err);
          if(!dbAdmin){
            logger.error("Invalid Access: "+JSON.stringify(request));
            return;
          }
          Login.findOne({username:request.targetUser.username, role:request.targetUser.role, deleted:false}, function(err, result){
            if(err) logger.error(err);
            if(!result){
              socket.emit("update-password-error",{"message": "Password change failed.", error:true});
              return;
            }
            var login = new Login();
            login.setPassword(request.password);
            result.hash = login.hash;
            result.salt = login.salt;
            result.save(function(err, updatedLogin){
              if(err) logger.error(err);
              socket.emit("update-password-success", {"message": "Password changed successfully.", error:false});
              Session.remove({username:request.targetUser.username});
            });
          });

        });
      }

      if(request.user.details.role == 'partner'){
        if(request.targetUser.role != 'user') return;
        Login.findOne({hash:request.user.key, username:request.user.details.username, role:'partner', deleted:false, status:'active'}, function(err, dbAdmin){
          if(err) logger.error(err);
          if(!dbAdmin){
            logger.error("Invalid Access: "+JSON.stringify(request));
            return;
          }
          Login.findOne({username:request.targetUser.username, role:request.targetUser.role, deleted:false}, function(err, result){
            if(err) logger.error(err);
            if(!result){
              socket.emit("update-password-error",{"message": "Password change failed.", error:true});
              return;
            }
            var login = new Login();
            login.setPassword(request.password);
            result.hash = login.hash;
            result.salt = login.salt;
            result.save(function(err, updatedLogin){
              if(err) logger.error(err);
              socket.emit("update-password-success", {"message": "Password changed successfully.", error:false});
              Session.remove({username:request.targetUser.username});
            });
          });

        });
      }

      
    }
  });

};

module.exports.createUser = function(io, socket, request){
  // - validate request data
  console.log(request.newUser.role);
  if(!request) return;
  if(!request.user || !request.newUser) return;
  if(!request.user.details || !request.user._id || !request.user.key) return;
  if(!request.user.details.username || !request.user.details.role) return;
  if(!request.newUser.username || !request.newUser.password || !request.newUser.role) return;

  logger.info('createUser: '+JSON.stringify(request));

  // - check for permissions
  if(request.newUser.role == 'operator'){
    if(request.user.details.role != 'admin') return;
    // authenticate admin
    Login.findOne({username:request.user.details.username, role:'admin', status:'active', deleted:false, hash:request.user.key}, function(err, dbAdmin){
      if(err) logger.error(err);
      if(dbAdmin){
        // create manager
        // check if manager already exists
        User.findOne({username:request.newUser.username}, function(err, userCheck){
          if(err) logger.error(err);
          if(userCheck){
            logger.error('create-user-error: User already exists');
            socket.emit("create-user-error",{"message": "User already exists", error:true, user:userCheck});
            return;
          }
          //create new user
          var userLogin = new Login();
          userLogin.username = request.newUser.username;
          userLogin.role = 'operator';
          userLogin.setPassword(request.newUser.password);
          userLogin.status = 'inactive';
          userLogin.manager = dbAdmin.username;
          userLogin.deleted = false;

          //set user details
          var user = new User();
          user.username = userLogin.username;
          user.setDefaults();
          user.role = 'operator';
          user.manager = dbAdmin.username;
          user.openingDate = new Date();

          userLogin.save(function(err) {
            if(err){
              logger.error('create-user-error: DBError in Users');
              socket.emit("create-user-error",{"message": "Error in creating record", error:true});
              return;
            }
            else{
              //log start
              var log = new Log();
              log.username = userLogin.username;
              log.action = 'ACCOUNT';
              log.subAction = 'ACCOUNT_CREATE';
              log.description = 'New account created.';
              log.manager = userLogin.manager;
              log.time = new Date();
              log.deleted = false;
              log.save(function(err){if(err){logger.error('create-user-error: Log entry failed.');}});
              //log end
              user.save(function(err){
                if(err){
                  logger.error('create-user-error: DBError in UserDetails');
                  socket.emit("create-user-error",{"message": "Error in saving user details.", error:true});
                }
                else{
                  logger.info('create-user-success: Manager account created successfully.');
                  socket.emit("create-user-success", user);
                }
              });
            }
          });
        });
      }
    });
  }
  if(request.newUser.role == 'manager'){
    if(request.user.details.role != 'admin') return;
    // authenticate admin
    Login.findOne({username:request.user.details.username, role:'admin', status:'active', deleted:false, hash:request.user.key}, function(err, dbAdmin){
      if(err){
        logger.debug(err);
        return;
      }
      if(dbAdmin){
        // create manager
        // check if manager already exists
        User.findOne({username:request.newUser.username}, function(err, userCheck){
          if(err){
            logger.debug(err);
            return;
          }
          if(userCheck){
            logger.error('create-user-error: User already exists');
            socket.emit("create-user-error",{"message": "User already exists", error:true, user:userCheck});
            return;
          }
          else{
            //create new user
            var userLogin = new Login();
            userLogin.username = request.newUser.username;
            userLogin.role = 'manager';
            userLogin.setPassword(request.newUser.password);
            userLogin.status = 'inactive';
            userLogin.manager = dbAdmin.username;
            userLogin.deleted = false;

            //set user details
            var user = new User();
            user.username = userLogin.username;
            user.setDefaults();
            user.role = 'manager';
            user.manager = dbAdmin.username;
            user.openingDate = new Date();

            userLogin.save(function(err) {
              if(err){
                logger.error('create-user-error: DBError in Users');
                socket.emit("create-user-error",{"message": "Error in creating record", error:true});
                return;
              }
              else{
                //log start
                var log = new Log();
                log.username = userLogin.username;
                log.action = 'ACCOUNT';
                log.subAction = 'ACCOUNT_CREATE';
                log.description = 'New account created.';
                log.manager = userLogin.manager;
                log.time = new Date();
                log.deleted = false;
                log.save(function(err){if(err){logger.error('create-user-error: Log entry failed.');}});
                //log end
                user.save(function(err){
                  if(err){
                    logger.error('create-user-error: DBError in UserDetails');
                    socket.emit("create-user-error",{"message": "Error in saving user details.", error:true});
                  }
                  else{
                    logger.info('create-user-success: Manager account created successfully.');
                    socket.emit("create-user-success", user);
                  }
                });
              }
            });
          }
        });
      }
    });
  }
  if(request.newUser.role == 'partner'){
    if(request.user.details.role != 'admin' && request.user.details.role != 'manager') return;
    // authenticate manager
    User.findOne({username:request.user.details.username, role:'manager', status:'active', deleted:false}, function(err, dbAdmin){
      if(err){
        logger.debug(err);
        return;
      }
      if(dbAdmin){
        // create manager
        // check if manager already exists
        User.findOne({username:request.newUser.username}, function(err, userCheck){
          if(err){
            logger.debug(err);
            return;
          }
          if(userCheck){
            logger.error('create-user-error: User already exists');
            socket.emit("create-user-error",{"message": "User already exists", error:true, user:userCheck});
            return;
          }
          dbAdmin.partnerCount += 1;
          if(dbAdmin.userCount > dbAdmin.partnetLimit){
            logger.error('create-user-error: Out of user quota.');
            socket.emit("create-user-error",{"message": "You reached maximum number of partners under you. Please increase your partner quota.", error:true});
            return;
          }
          dbAdmin.save(function(err){
            if(err) logger.error(err);
          });

          //create new user
          var userLogin = new Login();
          userLogin.username = request.newUser.username;
          userLogin.role = 'partner';
          userLogin.setPassword(request.newUser.password);
          userLogin.status = 'inactive';
          userLogin.manager = dbAdmin.username;
          userLogin.deleted = false;
         
          //set user details
          var user = new User();
          user.username = userLogin.username;
          user.setDefaults();
          user.role = 'partner';
          user.limit=request.user.details.limit;
          user.manager = dbAdmin.username;
          user.openingDate = new Date();

          userLogin.save(function(err) {
            if(err){
              logger.error('create-user-error: DBError in Users');
              socket.emit("create-user-error",{"message": "Error in creating record", error:true});
              return;
            }
            else{
              //log start
              var log = new Log();
              log.username = userLogin.username;
              log.action = 'ACCOUNT';
              log.subAction = 'ACCOUNT_CREATE';
              log.description = 'New account created.';
              log.manager = userLogin.manager;
              log.time = new Date();
              log.deleted = false;
              log.save(function(err){if(err){logger.error('create-user-error: Log entry failed.');}});
              //log end
              user.save(function(err){
                if(err){
                  logger.error('create-user-error: DBError in UserDetails');
                  socket.emit("create-user-error",{"message": "Error in saving user details.", error:true});
                }
                else{
                  logger.info('create-user-success: User account created successfully.');
                  socket.emit("create-user-success", user);
                }
              });
            }
          });
        });
      }
    });
  }
  if(request.newUser.role == 'user'){
    if(request.user.details.role != 'admin' && request.user.details.role != 'manager' && request.user.details.role != 'partner') return;
    // authenticate manager
    User.findOne({username:request.user.details.username, role:{$in:['admin', 'manager', 'partner']}, status:'active', deleted:false}, function(err, dbAdmin){
      if(err) logger.error(err);
      if(!dbAdmin) return;
      if(dbAdmin.role == 'partner'){
        User.findOne({username:request.user.details.manager, role:'manager', status:'active', deleted:false}, function(err, dbManager){
          if(err) logger.error(err);
          if(!dbManager) return;
          User.findOne({username:request.newUser.username}, function(err, userCheck){
            if(err) logger.error(err);
            if(userCheck){
              logger.error('create-user-error: User already exists');
              socket.emit("create-user-error",{"message": "User already exists", error:true, user:userCheck});
              return;
            }
            dbManager.userCount += 1;
            if(dbManager.userCount > dbManager.userLimit){
              logger.error('create-user-error: Out of user quota.');
              socket.emit("create-user-error",{"message": "You reached maximum number of users under you. Please increase your user quota.", error:true});
              return;
            }
            dbManager.save(function(err){
              if(err) logger.error(err);
            });
            //create new user
            var userLogin = new Login();
            userLogin.username = request.newUser.username;
            userLogin.role = 'user';
            userLogin.setPassword(request.newUser.password);
            userLogin.status = 'active';
            userLogin.manager = dbManager.username;
            userLogin.deleted = false;

            //set user details
            var user = new User();
            user.username = userLogin.username;
            user.setDefaults();
            user.matchFees = dbManager.matchFees;
            user.role = 'user';
            user.manager = dbManager.username;
            user.openingDate = new Date();

            userLogin.save(function(err) {
              if(err){
                logger.error('create-user-error: DBError in Users');
                socket.emit("create-user-error",{"message": "Error in creating record", error:true});
                return;
              }
              else{
                //log start
                var log = new Log();
                log.username = userLogin.username;
                log.action = 'ACCOUNT';
                log.subAction = 'ACCOUNT_CREATE';
                log.description = 'New account created.';
                log.manager = request.user.details.username;
                log.time = new Date();
                log.deleted = false;
                log.save(function(err){if(err){logger.error('create-user-error: Log entry failed.');}});
                //log end
                user.save(function(err){
                  if(err){
                    logger.error('create-user-error: DBError in UserDetails');
                    socket.emit("create-user-error",{"message": "Error in saving user details.", error:true});
                  }
                  else{
                    logger.info('create-user-success: User account created successfully.');
                    socket.emit("create-user-success", user);
                  }
                });
              }
            });
          });

        });
      }
      else{
      User.findOne({username:request.newUser.username}, function(err, userCheck){
        if(err) logger.error(err);
        if(userCheck){
          logger.error('create-user-error: User already exists');
          socket.emit("create-user-error",{"message": "User already exists", error:true, user:userCheck});
          return;
        }
        dbAdmin.userCount += 1;
        if(dbAdmin.userCount > dbAdmin.userLimit){
          logger.error('create-user-error: Out of user quota.');
          socket.emit("create-user-error",{"message": "You reached maximum number of users under you. Please increase your user quota.", error:true});
          return;
        }
        dbAdmin.save(function(err){
          if(err) logger.error(err);
        });
        //create new user
        var userLogin = new Login();
        userLogin.username = request.newUser.username;
        userLogin.role = 'user';
        userLogin.setPassword(request.newUser.password);
        userLogin.status = 'inactive';
        userLogin.manager = dbAdmin.username;
        userLogin.deleted = false;

        //set user details
        var user = new User();
        user.username = userLogin.username;
        user.setDefaults();
        user.matchFees = dbAdmin.matchFees;
        user.role = 'user';
        user.manager = dbAdmin.username;
        user.openingDate = new Date();

        userLogin.save(function(err) {
          if(err){
            logger.error('create-user-error: DBError in Users');
            socket.emit("create-user-error",{"message": "Error in creating record", error:true});
            return;
          }
          else{
            //log start
            var log = new Log();
            log.username = userLogin.username;
            log.action = 'ACCOUNT';
            log.subAction = 'ACCOUNT_CREATE';
            log.description = 'New account created.';
            log.manager = userLogin.manager;
            log.time = new Date();
            log.deleted = false;
            log.save(function(err){if(err){logger.error('create-user-error: Log entry failed.');}});
            //log end
            user.save(function(err){
              if(err){
                logger.error('create-user-error: DBError in UserDetails');
                socket.emit("create-user-error",{"message": "Error in saving user details.", error:true});
              }
              else{
                logger.info('create-user-success: User account created successfully.');
                socket.emit("create-user-success", user);
              }
            });
          }
        });
      });
      }
    });
  }
}




module.exports.getBalance = function(io, socket, request){
  if(!request) return;
  if(!request.user) return;
  logger.info("getUser: request="+JSON.stringify(request));

 console.log(request.user);
    if(request.user.details.role=="manager")
    {
  User.findOne({username:request.user.details.username, role:'manager', deleted:false}, function(err, user){
      if(err) logger.error(err);
      socket.emit('update-manager-balance-success', user);
    });
    }
    else
    {
    User.findOne({username:request.user.details.username, role:'partner', deleted:false}, function(err, user){
      if(err) logger.error(err);
      socket.emit('update-manager-balance-success', user);
    });
    }
   
  
  
}

module.exports.getUser = function(io, socket, request){
  if(!request) return;
  if(!request.user) return;
  logger.info("getUser: request="+JSON.stringify(request));

  if(request.user.details.role == 'user'){
    User.findOne({username:request.user.details.username}, function(err, dbUser){
      if(err) logger.error(err);
      socket.emit('get-user-success', dbUser);
    });
  }
  if(request.user.details.role == 'partner'){
    if(!request.filter) request['filter'] = {username:request.user.details.username, role:'partner', deleted:false};
    if(!request.filter) return;
    User.findOne(request.filter, function(err, user){
      if(err) logger.error(err);
      socket.emit('get-user-success', user);
    });
  }
  if(request.user.details.role == 'manager'){
    if(!request.filter) request['filter'] = {username:request.user.details.username, role:'manager', deleted:false};
    if(!request.filter) return;
    User.findOne(request.filter, function(err, user){
      if(err) logger.error(err);
      socket.emit('get-user-success', user);
    });
  }
  if(request.user.details.role == 'admin'){
    if(!request.filter) request['filter'] = {username:request.user.details.username, role:'admin', deleted:false};
    if(!request.filter) return;
    User.findOne(request.filter, function(err, user){
      if(err) logger.error(err);
      socket.emit('get-user-success', user);
    });
  }
}

module.exports.getUsers = function(io, socket, request){
  if(!request) return;
  if(!request.user) return;
  if(!request.user.details) return;
  logger.info("getUser: request="+JSON.stringify(request));

  if(request.user.details.role == 'partner'){
    if(!request.filter || !request.sort) return;
    Login.findOne({hash:request.user.key, username:request.user.details.username, role:'partner', deleted:false, status:'active'}, function(err, dbManager){
      if(err) logger.error(err);
      if(!dbManager){
        logger.error("Invalid Access: "+JSON.stringify(request));
        return;
      }
      User.find(request.filter).sort(request.sort).exec(function(err, result){
        if(err) logger.error(err);
        socket.emit("get-users-success", result);
      });
    });
  }
  if(request.user.details.role == 'manager'){
    if(!request.filter || !request.sort) return;
    Login.findOne({hash:request.user.key, username:request.user.details.username, role:'manager', deleted:false, status:'active'}, function(err, dbManager){
      if(err) logger.error(err);
      if(!dbManager){
        logger.error("Invalid Access: "+JSON.stringify(request));
        return;
      }
      User.find(request.filter).sort(request.sort).exec(function(err, result){
        if(err) logger.error(err);
        socket.emit("get-users-success", result);
      });
    });
  }
  if(request.user.details.role == 'admin'){
    if(!request.filter || !request.sort) return;
    Login.findOne({hash:request.user.key, username:request.user.details.username, role:'admin', deleted:false, status:'active'}, function(err, dbAdmin){
      if(err) logger.error(err);
      if(!dbAdmin){
        logger.error("Invalid Access: "+JSON.stringify(request));
        return;
      }
      User.find(request.filter).sort(request.sort).exec(function(err, result){
        if(err) logger.error(err);
        socket.emit("get-users-success", result);
      });
    });
  }

  if(request.user.details.role == 'operator'){
    if(!request.filter || !request.sort) return;
    Login.findOne({hash:request.user.key, username:request.user.details.username, role:'operator', deleted:false, status:'active'}, function(err, dbAdmin){
      if(err) logger.error(err);
      if(!dbAdmin){
        logger.error("Invalid Access: "+JSON.stringify(request));
        return;
      }
      User.find(request.filter).sort(request.sort).exec(function(err, result){
        if(err) logger.error(err);
        socket.emit("get-users-success", result);
      });
    });
  }
}

module.exports.getUserCount = function(io, socket, request){
  if(!request) return;
  if(!request.user) return;
  if(!request.user.details) return;
  logger.info("getUserCount: request="+JSON.stringify(request));

  Login.findOne({username:request.user.details.username, role:request.user.details.role, hash:request.user.key, deleted:false}, function(err, dbUser){
    if(err) logger.debug(err);
    if(!dbUser){
      logger.error("Invalid Access: "+JSON.stringify(request));
      socket.emit('logout');
      return;
    }
    if(dbUser.role == 'admin'){
      result = {user:0, manager:0, partner:0, joinedToday:0, joinedThisMonth:0, blockedManagers:0};
      User.count({role:'manager', deleted:false, status:'active'}).exec(function(err, managerCount){
        if(err) logger.error(err);
        result['manager'] = managerCount;
        User.count({role:'partner', deleted:false, status:'active'}).exec(function(err, partnerCount){
          if(err) logger.error(err);
          result['partner'] = partnerCount;
          User.count({role:'user', deleted:false, status:'active'}).exec(function(err, userCount){
            if(err) logger.error(err);
            result['user'] = userCount;
            User.count({deleted:false, status:'active', openingDate:{$gte: (new Date((new Date()).getTime() - (1 * 24 * 60 * 60 * 1000)))}}).exec(function(err, joinedTodayCount){
              if(err) logger.error(err);
              result['joinedToday'] = joinedTodayCount;
              User.count({deleted:false, status:'active', openingDate:{$gte: (new Date((new Date()).getTime() - (30 * 24 * 60 * 60 * 1000)))}}).exec(function(err, joinedThisMonth){
                if(err) logger.error(err);
                result['joinedThisMonth'] = joinedThisMonth;
                User.count({deleted:false, status:'blocked'}).exec(function(err, blockedManagers){
                  if(err) logger.error(err);
                  result['blockedManagers'] = blockedManagers;
                  socket.emit('get-user-count-success', result);
                });
              });
            });
          });
        });
      });
    }
    if(dbUser.role == 'operator'){
      result = {user:0, manager:0, partner:0, joinedToday:0, joinedThisMonth:0, blockedManagers:0};
      User.count({role:'manager', deleted:false, status:'active'}).exec(function(err, managerCount){
        if(err) logger.error(err);
        result['manager'] = managerCount;
        User.count({role:'partner', deleted:false, status:'active'}).exec(function(err, partnerCount){
          if(err) logger.error(err);
          result['partner'] = partnerCount;
          User.count({role:'user', deleted:false, status:'active'}).exec(function(err, userCount){
            if(err) logger.error(err);
            result['user'] = userCount;
            User.count({deleted:false, status:'active', openingDate:{$gte: (new Date((new Date()).getTime() - (1 * 24 * 60 * 60 * 1000)))}}).exec(function(err, joinedTodayCount){
              if(err) logger.error(err);
              result['joinedToday'] = joinedTodayCount;
              User.count({deleted:false, status:'active', openingDate:{$gte: (new Date((new Date()).getTime() - (30 * 24 * 60 * 60 * 1000)))}}).exec(function(err, joinedThisMonth){
                if(err) logger.error(err);
                result['joinedThisMonth'] = joinedThisMonth;
                User.count({deleted:false, status:'blocked'}).exec(function(err, blockedManagers){
                  if(err) logger.error(err);
                  result['blockedManagers'] = blockedManagers;
                  socket.emit('get-user-count-success', result);
                });
              });
            });
          });
        });
      });
    }
  });
}

module.exports.updateUser = function(io, socket, request){
  console.log(request);
  if(!request) return;
  if(!request.user || !request.updatedUser) return;
  logger.debug("updateUser: "+JSON.stringify(request));

  Login.findOne({username:request.user.details.username, deleted:false, status:'active', role:request.user.details.role}, function(err, dbUser){
    if(err){
      logger.error(err);
      return;
    }
    if(!dbUser){
      logger.error("Invalid username for given role "+JSON.stringify(dbUser));
      return;
    }
    if(dbUser.role == 'admin'){
      if(request.updatedUser.role == 'admin'){
        User.update({username:dbUser.username, role:request.updatedUser.role},
          {$set:{
            image:request.updatedUser.image
          }}, function(err, dbUpdatedUser){
            if(err){
              logger.debug(err);
            }
            socket.emit('update-user-success',{message:'User record updated successfully.'});
          });
      }
      else{
        Login.update({username:request.updatedUser.username, role:request.updatedUser.role}, {$set:{status:request.updatedUser.status, loginAttempts:0}}, function(err, dbUpdatedLogin){
          if(err){
            logger.debug(err);
            return;
          }
          User.update({username:request.updatedUser.username, role:request.updatedUser.role},
            {$set:{
              status:request.updatedUser.status,
              image:request.updatedUser.image,
              availableEventTypes:request.updatedUser.availableEventTypes,
              sessionAccess:request.updatedUser.sessionAccess,
              partnerPermissions:request.updatedUser.partnerPermissions,
              partnerLimit:request.updatedUser.partnerLimit,
              userLimit:request.updatedUser.userLimit
            }}, function(err, dbUpdatedUser){
              if(err){
                logger.debug(err);
              }
              socket.emit('update-user-success',{message:'User record updated successfully.'});
            });
        });
      }
    }
    if(dbUser.role == 'manager'){
      if(request.updatedUser.role == 'manager'){
        User.update({username:dbUser.username, role:request.updatedUser.role},
          {$set:{
            image:request.updatedUser.image
          }}, function(err, dbUpdatedUser){
            if(err){
              logger.debug(err);
            }
            socket.emit('update-user-success',{message:'User record updated successfully.'});
          });
      }
      if(request.updatedUser.role == 'partner'){
        Login.update({username:request.updatedUser.username, role:request.updatedUser.role}, {$set:{status:request.updatedUser.status, loginAttempts:0}}, function(err, dbUpdatedLogin){
          if(err){
            logger.debug(err);
            return;
          }
          User.update({username:request.updatedUser.username, role:request.updatedUser.role},
            {$set:{
              status:request.updatedUser.status,
              image:request.updatedUser.image,
              partnerPermissions:request.updatedUser.partnerPermissions
            }}, function(err, dbUpdatedUser){
              console.log(err);
              if(err){
                logger.debug(err);
              }
              socket.emit('update-user-success',{message:'User record updated successfully.'});
            });
        });
      }
      if(request.updatedUser.role == 'user'){
        Login.update({username:request.updatedUser.username, role:request.updatedUser.role}, {$set:{status:request.updatedUser.status, loginAttempts:0}}, function(err, dbUpdatedLogin){
          if(err){
            logger.debug(err);
            return;
          }
          User.update({username:request.updatedUser.username, role:request.updatedUser.role},
            {$set:{
              status:request.updatedUser.status,
              image:request.updatedUser.image
            }}, function(err, dbUpdatedUser){
              if(err){
                logger.debug(err);
              }
              socket.emit('update-user-success',{message:'User record updated successfully.'});
            });
        });
      }
    }
    if(dbUser.role == 'partner'){

       if(request.updatedUser.role == 'manager'){
        User.update({username:dbUser.username, role:request.updatedUser.role},
          {$set:{
            image:request.updatedUser.image
          }}, function(err, dbUpdatedUser){
            if(err){
              logger.debug(err);
            }
            socket.emit('update-user-success',{message:'User record updated successfully.'});
          });
      }
      if(request.updatedUser.role == 'partner'){
        Login.update({username:request.updatedUser.username, role:request.updatedUser.role}, {$set:{status:request.updatedUser.status, loginAttempts:0}}, function(err, dbUpdatedLogin){
          if(err){
            logger.debug(err);
            return;
          }
          User.update({username:request.updatedUser.username, role:request.updatedUser.role},
            {$set:{
              status:request.updatedUser.status,
              image:request.updatedUser.image,
              partnerPermissions:request.updatedUser.partnerPermissions
            }}, function(err, dbUpdatedUser){
              console.log(err);
              if(err){
                logger.debug(err);
              }
              socket.emit('update-user-success',{message:'User record updated successfully.'});
            });
        });
      }
      if(request.updatedUser.role == 'user'){
        Login.update({username:request.updatedUser.username, role:request.updatedUser.role}, {$set:{status:request.updatedUser.status, loginAttempts:0}}, function(err, dbUpdatedLogin){
          if(err){
            logger.debug(err);
            return;
          }
          User.update({username:request.updatedUser.username, role:request.updatedUser.role},
            {$set:{
              status:request.updatedUser.status,
              image:request.updatedUser.image
            }}, function(err, dbUpdatedUser){
              if(err){
                logger.debug(err);
              }
              socket.emit('update-user-success',{message:'User record updated successfully.'});
            });
        });
      }
      //check for additional permissions
    }
    if(dbUser.role == 'user'){
      User.update({username:request.updatedUser.username, role:'user', deleted:false, status:'active'},{$set:{image:request.updatedUser.image}}, function(err, dbUpdatedUser){
        if(err) logger.error(err);
        socket.emit('update-user-success',{message:'User record updated successfully.'});
        Bet.update({username:request.updatedUser.username},{$set:{image:request.updatedUser.image}}, {multi:true}, function(err, result){
          if(err) logger.error(err);
        });
        Session.update({username:request.updatedUser.username},{$set:{image:request.updatedUser.image}}, function(err, result){
          if(err) logger.error(err);
        });
      });
    }
  });
}

module.exports.updateUserBalance = function(io, socket, request){
  if(!request) return;
  if(!request.user || !request.targetUser) return;
  if(!request.user.details) return;
  logger.info("updateUserBalance: "+JSON.stringify(request));
  Login.findOne({username:request.user.details.username, hash:request.user.key}, {role:1, username:1}, function(err, dbUser){
    if(err) logger.error(err);
    if(!dbUser) return;
    if(dbUser.role!='admin' && dbUser.role!='manager' && dbUser.role!='partner') return;
     if(dbUser.role=='manager')
   {
      
       

     if(request.targetUser.mbalance!=null)
     {
    User.findOne({username:request.targetUser.username, role:'user', deleted:false}, function(err, dbOldTragetUser){
       User.findOne({username:dbUser.username, role:'manager', deleted:false}, function(err, mnaagerBalaance){
    if(request.targetUser.action=='DEPOSIT')
      {
          var balance=dbOldTragetUser.balance+request.targetUser.amount;
           var limit=dbOldTragetUser.limit+request.targetUser.amount;
           var mbalance=mnaagerBalaance.limit-request.targetUser.amount;
           if(balance==request.targetUser.balance && limit==request.targetUser.limit)
           {

           }
           else
           {
           
             socket.emit("update-user-balance-error-success",{message:"Unexpected error occur please try again.!"});
             return; 

           }

         
      }
      else if(request.targetUser.action=='WITHDRAW')
      {
         var balance=dbOldTragetUser.balance-request.targetUser.amount;
           var limit=dbOldTragetUser.limit-request.targetUser.amount;
            var mbalance=mnaagerBalaance.limit+request.targetUser.amount;
           if(balance==request.targetUser.balance && limit==request.targetUser.limit)
           {

           }
           else
           {
             socket.emit("update-user-balance-error-success",{message:"Unexpected error occur please try again.!"});
             return; 

           }
      }
      else
      {
        socket.emit("update-user-balance-error-success", {message:"Update your app please contact upline."});
        return;
      }
      if(err) logger.error(err);
      socket.emit("update-user-balance-error-success", {message:"Balance "+request.targetUser.action+" successfully.!"});
      User.update({username:request.targetUser.username, role:'user', deleted:false}, {$set:{limit:limit, balance:balance}}, function(err, raw){
        if(err) logger.error(err);
       
        socket.emit("update-user-balance-success", request.targetUser);
        //log start

     
      User.update({username:request.user.details.username, role:'manager', deleted:false}, {$set:{limit:mbalance}}, function(err, raw1){
         if(err) logger.error(err);
        //update part
        //update manager balance after deposit
      User.find({manager:request.user.details.username, role:'partner', deleted:false}, function(err, mpartner){
          for(var i=0;i<mpartner.length;i++)
          {
        User.update({username:mpartner[i].username, role:'partner', deleted:false}, {$set:{limit:mbalance}}, function(err, raw){    
          
           });
       
          }
        
          });
        
     //end
      
       User.findOne({username:request.user.details.username, role:'manager', deleted:false}, function(err, dbmanager){
         socket.emit("update-manager-balance-success",dbmanager);
         });
      
    
         });
        var log = new Log();
        log.username = dbOldTragetUser.username;
        log.action = 'BALANCE';
        if(dbOldTragetUser.limit < request.targetUser.limit){
          log.subAction = 'BALANCE_DEPOSIT';
        }
        else{
          log.subAction = 'BALANCE_WITHDRAWL';
        }
        log.mnewLimit=mbalance;
        log.description = 'Balance updated. Old Limit: '+dbOldTragetUser.limit+'. New Limit: '+request.targetUser.limit;
        log.manager = dbUser.username;
        log.relation=dbUser.username;
        log.time = new Date();
        log.deleted = false;
        //console.log(log);
        log.save(function(err){if(err){logger.error('update-user-balance-error: Log entry failed.');}});
        //log end
      });
    });
    });
  }

   }
   if(dbUser.role=='partner')
   {
    if(request.targetUser.mbalance!=null)
     {
    User.findOne({username:request.targetUser.username, role:'user', deleted:false}, function(err, dbOldTragetUser){
       User.findOne({username:dbUser.username, role:'partner', deleted:false}, function(err, mnaagerBalaance){
      if(request.targetUser.action=='DEPOSIT')
      {
          var balance=dbOldTragetUser.balance+request.targetUser.amount;
           var limit=dbOldTragetUser.limit+request.targetUser.amount;
           var mbalance=mnaagerBalaance.limit-request.targetUser.amount;
           if(balance==request.targetUser.balance && limit==request.targetUser.limit)
           {

           }
           else
           {
             socket.emit("update-user-balance-error-success",{message:"Unexpected error occur please try again.!"});
             return; 

           }

         
      }
      else if(request.targetUser.action=='WITHDRAW')
      {
         var balance=dbOldTragetUser.balance-request.targetUser.amount;
           var limit=dbOldTragetUser.limit-request.targetUser.amount;
            var mbalance=mnaagerBalaance.limit+request.targetUser.amount;
           if(balance==request.targetUser.balance && limit==request.targetUser.limit)
           {

           }
           else
           {
             socket.emit("update-user-balance-error-success",{message:"Unexpected error occur please try again.!"});
             return; 

           }
      }
      else
      {
        socket.emit("update-user-balance-error-success", {message:"Update your app please contact upline."});
        return;
      }

       //socket.emit("update-user-balance-error-success", {message:"Balance "+request.targetUser.action+" successfully.!"});
      if(err) logger.error(err);
      User.update({username:request.targetUser.username, role:'user', deleted:false}, {$set:{limit:limit, balance:balance}}, function(err, raw){
        if(err) logger.error(err);
       
        //socket.emit("update-user-balance-success", request.targetUser);
        //log start

     
      User.update({username:request.user.details.manager, role:'manager', deleted:false}, {$set:{limit:mbalance}}, function(err, raw1){
         //console.log(request.user.details.manager);
         //console.log(request.targetUser.mbalance);
         
         if(err) logger.error(err);
        //update part
        //update manager balance after deposit
      User.find({manager:request.user.details.manager, role:'partner', deleted:false}, function(err, mpartner){
          for(var i=0;i<mpartner.length;i++)
          {
        User.update({username:mpartner[i].username, role:'partner', deleted:false}, {$set:{limit:mbalance}}, function(err, raw){   
          console.log(raw);
           });
        
          }
        
          });
        
     //end
      
       User.findOne({username:request.user.details.username, role:'partner', deleted:false}, function(err, dbmanager){
         //socket.emit("update-manager-balance-success",dbmanager);
         });
      
    
         });
        var log = new Log();
        log.username = dbOldTragetUser.username;
        log.action = 'BALANCE';
        if(dbOldTragetUser.limit < request.targetUser.limit){
          log.subAction = 'BALANCE_DEPOSIT';
        }
        else{
          log.subAction = 'BALANCE_WITHDRAWL';
        }
        log.mnewLimit=request.targetUser.mbalance;
        log.description = 'Balance updated. Old Limit: '+dbOldTragetUser.limit+'. New Limit: '+request.targetUser.limit;
        log.manager = dbUser.username;
        log.relation=request.user.details.manager;
        log.time = new Date();
        log.deleted = false;
       // console.log(log);
        log.save(function(err){if(err){logger.error('update-user-balance-error: Log entry failed.');}});
        //log end
      });
    });
  });
  }
   }

   /*if(dbUser.role=='manager')
   {

     if(request.targetUser.mbalance!=null)
     {
    User.findOne({username:request.targetUser.username, role:'user', deleted:false}, function(err, dbOldTragetUser){
      if(err) logger.error(err);
      User.update({username:request.targetUser.username, role:'user', deleted:false}, {$set:{limit:request.targetUser.limit, balance:request.targetUser.balance}}, function(err, raw){
        if(err) logger.error(err);
       
        socket.emit("update-user-balance-success", request.targetUser);
        //log start

     
      User.update({username:request.user.details.username, role:'manager', deleted:false}, {$set:{limit:request.targetUser.mbalance}}, function(err, raw1){
         if(err) logger.error(err);
        //update part
        //update manager balance after deposit
      User.find({manager:request.user.details.username, role:'partner', deleted:false}, function(err, mpartner){
          for(var i=0;i<mpartner.length;i++)
          {
        User.update({username:mpartner[i].username, role:'partner', deleted:false}, {$set:{limit:request.targetUser.mbalance}}, function(err, raw){  	
          
           });
       
          }
        
          });
        
     //end
      
       User.findOne({username:request.user.details.username, role:'manager', deleted:false}, function(err, dbmanager){
         socket.emit("update-manager-balance-success",dbmanager);
         });
      
    
         });
        var log = new Log();
        log.username = dbOldTragetUser.username;
        log.action = 'BALANCE';
        if(dbOldTragetUser.limit < request.targetUser.limit){
          log.subAction = 'BALANCE_DEPOSIT';
        }
        else{
          log.subAction = 'BALANCE_WITHDRAWL';
        }
        log.mnewLimit=request.targetUser.mbalance;
        log.description = 'Balance updated. Old Limit: '+dbOldTragetUser.limit+'. New Limit: '+request.targetUser.limit;
        log.manager = dbUser.username;
        log.relation=dbUser.username;
        log.time = new Date();
        log.deleted = false;
        //console.log(log);
        log.save(function(err){if(err){logger.error('update-user-balance-error: Log entry failed.');}});
        //log end
      });
    });
  }
   }
   if(dbUser.role=='partner')
   {
    if(request.targetUser.mbalance!=null)
     {
    User.findOne({username:request.targetUser.username, role:'user', deleted:false}, function(err, dbOldTragetUser){
      if(err) logger.error(err);
      User.update({username:request.targetUser.username, role:'user', deleted:false}, {$set:{limit:request.targetUser.limit, balance:request.targetUser.balance}}, function(err, raw){
        if(err) logger.error(err);
       
        socket.emit("update-user-balance-success", request.targetUser);
        //log start

     
      User.update({username:request.user.details.manager, role:'manager', deleted:false}, {$set:{limit:request.targetUser.mbalance}}, function(err, raw1){
         //console.log(request.user.details.manager);
         //console.log(request.targetUser.mbalance);
         
         if(err) logger.error(err);
        //update part
        //update manager balance after deposit
      User.find({manager:request.user.details.manager, role:'partner', deleted:false}, function(err, mpartner){
          for(var i=0;i<mpartner.length;i++)
          {
        User.update({username:mpartner[i].username, role:'partner', deleted:false}, {$set:{limit:request.targetUser.mbalance}}, function(err, raw){   
          console.log(raw);
           });
        
          }
        
          });
        
     //end
      
       User.findOne({username:request.user.details.username, role:'partner', deleted:false}, function(err, dbmanager){
         socket.emit("update-manager-balance-success",dbmanager);
         });
      
    
         });
        var log = new Log();
        log.username = dbOldTragetUser.username;
        log.action = 'BALANCE';
        if(dbOldTragetUser.limit < request.targetUser.limit){
          log.subAction = 'BALANCE_DEPOSIT';
        }
        else{
          log.subAction = 'BALANCE_WITHDRAWL';
        }
        log.mnewLimit=request.targetUser.mbalance;
        log.description = 'Balance updated. Old Limit: '+dbOldTragetUser.limit+'. New Limit: '+request.targetUser.limit;
        log.manager = dbUser.username;
        log.relation=request.user.details.manager;
        log.time = new Date();
        log.deleted = false;
       // console.log(log);
        log.save(function(err){if(err){logger.error('update-user-balance-error: Log entry failed.');}});
        //log end
      });
    });
  }
   }*/

    
   
   if(dbUser.role=='admin')
   {
   
    //console.log(request);
   User.findOne({username:request.targetUser.username, role:'manager', deleted:false}, function(err, dbOldTragetUser){
      if(err) logger.error(err);
      User.update({username:request.targetUser.username, role:'manager', deleted:false}, {$set:{limit:request.targetUser.limit}}, function(err, raw){
        if(err) logger.error(err);
        //console.log(request.targetUser.limit);
         //update balance for partner
         User.find({manager:request.targetUser.username, role:'partner', deleted:false}, function(err, mpartner){
          for(var i=0;i<mpartner.length;i++)
          {
        User.update({username:mpartner[i].username, role:'partner', deleted:false}, {$set:{limit:request.targetUser.limit}}, function(err, raw){  	
          console.log(raw);
           });
          }
        
          });
         //end
        socket.emit("update-user-balance-success", request.targetUser);
        //log start
        var log = new Log();
        log.username = dbOldTragetUser.username;
        log.action = 'BALANCE';
        if(dbOldTragetUser.limit < request.targetUser.limit){
          log.subAction = 'BALANCE_DEPOSIT';
        }
        else{
          log.subAction = 'BALANCE_WITHDRAWL';
        }
        log.oldLimit=dbOldTragetUser.limit;
        log.newLimit=request.targetUser.limit;
        log.description = 'Balance updated. Old Limit: '+dbOldTragetUser.limit+'. New Limit: '+request.targetUser.limit;
        log.manager ='admin';
        log.relation=dbOldTragetUser.username;
        log.time = new Date();
        log.deleted = false;
       // console.log(log);
        log.save(function(err){if(err){logger.error('update-user-balance-error: Log entry failed.');}});
        //log end


        //log for admin n manager deposit
      });
    });

   }

  });
}

module.exports.deleteUser = function(io, socket, request){
  if(!request) return;
  if(!request.user || !request.targetUser) return;
  logger.info("deleteUser: "+JSON.stringify(request));

  if(request.user.details.role == 'manager'){
    if(request.targetUser.role != 'user' && request.targetUser.role != 'partner') return;
    Login.findOne({hash:request.user.key, username:request.user.details.username, role:'manager', deleted:false, status:'active'}, function(err, dbAdmin){
      if(err) logger.error(err);
      if(!dbAdmin){
        logger.error("Invalid Access: "+JSON.stringify(request));
        return;
      }
      User.update({username:request.targetUser.username, role:request.targetUser.role}, {$set:{status:'inactive', deleted:true}}, function(err, raw){
        if(err) logger.error(err);
        Login.update({username:request.targetUser.username, role:request.targetUser.role}, {$set:{status:'inactive', deleted:true}}, function(err, raw){
          if(err) logger.error(err);
          //log start
          var log = new Log();
          log.username = request.targetUser.username;
          log.action = 'ACCOUNT';
          log.subAction = 'ACCOUNT_DELETED';
          log.description = 'Account deleted.';
          log.manager = request.user.details.username;
          log.time = new Date();
          log.deleted = false;
          log.save(function(err){if(err){logger.error('delete-user-error: Log entry failed.');}});
          //log end
          socket.emit("delete-user-success", request.targetUser);
          User.findOne({username:request.user.details.username, deleted:false},function(err, m){
            if(err) logger.error(err);
            if(m){
              if(request.targetUser.role == 'user'){
                Bet.update({username:request.targetUser.username}, {$set:{deleted:true}}, {multi:true}, function(err, raw){
                  if(err) logger.error(err);
                });
                if(m.userCount) m.userCount = m.userCount*1-1;
              }
              if(request.targetUser.role == 'partner'){
                if(m.partnerCount) m.partnerCount = m.partnerCount*1-1;
              }
              m.save(function(err){
                if(err) logger.error(err);
              });
            }
          });
        });
      });
    });
  }

  if(request.user.details.role == 'partner'){
    if(request.targetUser.role != 'user') return;
    Login.findOne({hash:request.user.key, username:request.user.details.username, role:'partner', deleted:false, status:'active'}, function(err, dbAdmin){
      if(err) logger.error(err);
      if(!dbAdmin){
        logger.error("Invalid Access for partner: "+JSON.stringify(request));
        return;
      }
      User.update({username:request.targetUser.username, role:request.targetUser.role}, {$set:{status:'inactive', deleted:true}}, function(err, raw){
        if(err) logger.error(err);
        Login.update({username:request.targetUser.username, role:request.targetUser.role}, {$set:{status:'inactive', deleted:true}}, function(err, raw){
          if(err) logger.error(err);
          //log start
          var log = new Log();
          log.username = request.targetUser.username;
          log.action = 'ACCOUNT';
          log.subAction = 'ACCOUNT_DELETED';
          log.description = 'Account deleted.';
          log.manager = request.user.details.username;
          log.time = new Date();
          log.deleted = false;
          log.save(function(err){if(err){logger.error('delete-user-error: Log entry failed.');}});
          //log end
          socket.emit("delete-user-success", request.targetUser);
          User.findOne({username:request.user.details.username, deleted:false},function(err, m){
            if(err) logger.error(err);
            if(m){
              if(request.targetUser.role == 'user'){
                Bet.update({username:request.targetUser.username}, {$set:{deleted:true}}, {multi:true}, function(err, raw){
                  if(err) logger.error(err);
                });
                if(m.userCount) m.userCount = m.userCount*1-1;
              }
              if(request.targetUser.role == 'partner'){
                if(m.partnerCount) m.partnerCount = m.partnerCount*1-1;
              }
              m.save(function(err){
                if(err) logger.error(err);
              });
            }
          });
        });
      });
    });
  }
  if(request.user.details.role == 'admin'){
    if(request.targetUser.role != 'manager' && request.targetUser.role != 'operator') return;
    Login.findOne({hash:request.user.key, username:request.user.details.username, role:'admin', deleted:false, status:'active'}, function(err, dbAdmin){
      if(err) logger.error(err);
      if(!dbAdmin){
        logger.error("Invalid Access: "+JSON.stringify(request));
        return;
      }
      // Delete all users under the managers
      Login.update({manager:request.targetUser.username}, {$set:{status:'inactive', deleted:true}}, {multi:true}, function(err, raw){
        if(err) logger.error(err);
        User.update({manager:request.targetUser.username}, {$set:{status:'inactive', deleted:true}}, {multi:true}, function(err, raw){
          if(err) logger.error(err);
          Bet.update({manager:request.targetUser.username}, {$set:{deleted:true}}, {multi:true}, function(err, raw){
            if(err) logger.error(err);
            Login.update({username:request.targetUser.username, role:'manager'}, {$set:{status:'inactive', deleted:true}}, function(err, raw){
              if(err) logger.error(err);
              User.update({username:request.targetUser.username, role:'manager'}, {$set:{status:'inactive', deleted:true}}, function(err, raw){
                if(err) logger.error(err);
                socket.emit("delete-user-success", request.targetUser);
              });
            });
          });
        });
      });
    });

  }
}

module.exports.updateMatchFees = function(io, socket, request){
  if(!request) return;
  if(!request.user) return;
  if(!request.user.details) return;
  logger.debug("updateMatchFees: "+JSON.stringify(request));

  Login.findOne({username:request.user.details.username, role:request.user.details.role, hash:request.user.key, deleted:false}, function(err, dbUser){
    if(err) logger.debug(err);
    if(!dbUser){
      logger.error("Invalid Access: "+JSON.stringify(request));
      socket.emit('logout');
      return;
    }
    if(dbUser.role == 'manager'){
      User.update({username:dbUser.username, deleted:false, role:'manager'}, {$set:{matchFees:request.matchFees}}, function(err, raw){
        if(err) logger.error(err);
        User.update({manager:dbUser.username, deleted:false, role:'user'}, {$set:{matchFees:request.matchFees}}, {multi:true}, function(err, raw){
          if(err) logger.error(err);
          socket.emit("update-match-fees-success", {"message" : "Match fees updated successfully", error:false});
        });
      });
    }
  });
}
