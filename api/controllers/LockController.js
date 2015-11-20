/**
 * LockController
 *
 * @description :: Server-side logic for managing locks
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  index: function (req, res) {

    User.findOne({id: req.user.id}).populate('locks').exec(function (err, user) {
      if(err) return res.json(401, {err: 'Locks not retrieved:'+err});
      if(req.isSocket){
        //Lock.subscribe(req, _.pluck(user.locks,'id'));
        Lock.watch(req.socket);
      }

      return res.json(user.locks);
    });
  },

  create: function (req, res) {
    var user = req.user || false;

    var params = _.extend(req.query || {}, req.params || {}, req.body || {}, {users: user.id});

    if(req.isSocket && req.body.lock){
      console.log('im a socket');
      //console.log('im a socket', req.body, req.body.lock);
      //var params = req.body.lock.lock;
      var params = _.extend(req.body.lock.lock, {users: user.id});
      console.log('p', params);
    }
    console.log('my', params);


    Lock.create(params).exec(function (err, newLock) {

      if(err) return res.json(401, {err: 'Lock not created:'+err});


      Lock.findOne({id: newLock.id}).populate('users').exec(function(err, lock){

        if(err) return res.json(403, {err: 'forbidden'});
        if(!lock) return res.json(401, {err: 'Lock could not be created'});

        console.log('publish');
        Lock.publishCreate(lock, req);

        Log.create({lock: lock.id, user: req.user.id});

        return res.json({
            lock: lock
          });

      });
    });
  },


  show: function (req,res) {

    var id = req.param('id');

    if (!id) return res.send("No id specified.", 500);


    Lock.find(id, function (err, lock) {
      if(err) return res.sender(err,500);
      if(!lock) return res.send("Lock "+id+" not found", 404);

       return res.json({
        lock:lock
      });
    });
  },

  destroy: function (req,res) {
    var id = req.param('id');
    if (!id) return res.send("No id specified.",500);


    Lock.find(id, function (err, lock) {
      if (err) return res.sender(err, 500);
      if (!lock) return res.send("Lock " + id + " not found", 404);


      Lock.destroy(id, function (err) {
        if (err) return res.send(err, 500);


        return res.json({
          lock: 'Lock destroyed'
        });
      });
    });
  },

   update: function (req,res) {

     var id = req.param('id');

     if (!id) return res.send("No id specified.", 500);

     var params = _.extend(req.query || {}, req.params || {}, req.body || {});
     delete params.id;

     Lock.find(id, function (err, lock) {
       if (err) return res.sender(err, 500);
       if (!lock) return res.send("Lock " + id + " not found", 404);


       Lock.update(id,params).exec(function (err, lock) {

         if (err) return res.send(err, 500);

         state = lock[0].state ? '1' : '0';

         var http = require("http");

         options = {
           host: '192.168.240.1',
           port: 80,
           path: '/arduino/digital/13/'+state,
           method: 'GET'

         };

         var ws_data = "";
         var ws_request =  http.request(options, function(ws_response){
             ws_response.on('error',function(e){ console.log(e.message);});
             ws_response.on('data',function(chunk){ ws_data += chunk });
             ws_response.on('end',function(chunk){ console.log('end'); });
             console.log('ee', ws_data);
         });

         ws_request.write(ws_data);
         ws_request.end();

         Log.create({lock: lock.id, user: req.user.id});


         //Lock.publishUpdate(lock.id, lock, req);

         return res.json({
           lock: lock
         });
       });
     });
   }
};

