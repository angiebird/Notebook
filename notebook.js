'use strict';
  MathJax.Hub.Config({
    showProcessingMessages: false,
    tex2jax: { inlineMath: [['$','$'],['\\(','\\)']] }
  });
MathJax.Hub.Configured();

function insert(arr, item, pos){
    arr = arr.slice(0, pos+1).concat([item].concat(arr.slice(pos+1, arr.length)));
    return arr;
}
function remove(arr, pos){
    arr = arr.slice(0, pos).concat(arr.slice(pos+1, arr.length));
    return arr;
}

function intArrToStrArr(intArr){
    var strArr = []
    for(var i = 0; i < intArr.length; i++){
        strArr.push(String(intArr[i]));
    }
    return strArr;
}

var app = angular.module('notebook',[
        'textAngular',
        'ngRoute'
        ]);

app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/doc', {
        templateUrl: 'doc.html',
        controller: 'docCtrl'
      }).
      when('/note/:docId', {
        templateUrl: 'note.html',
        controller: 'noteCtrl'
      }).
      otherwise({
        redirectTo: '/note.html'
      });
  }]);

app.factory('DocService', function($q, $timeout) {
    var table = new AWS.DynamoDB({params: {TableName: 'Doc'}});

    var setDocCnt = function(cnt){
        var cntParams = {Item: {docId: {S: 'Counter'}, 
                                cnt:   {N: String(cnt)}}};

        table.putItem(cntParams, function() {});
    }

    var getDocCnt = function(){
        var def = $q.defer();
        var key = "Counter"
        table.getItem({Key: {docId: {S: key}}}, function(err, data) {
          if (err) {
            // an error occurred
            console.log(err, err.stack)
            def.reject("Failed to get docCnt");
          }
          else{
            console.log(data.Item); // print the item data
            var docCnt = parseInt(data.Item.cnt.N);
            def.resolve(docCnt);
          }
        });

        return def.promise;
    }
    var docCnt;
    getDocCnt().then(function(data){docCnt = data});

    var getDoc = function(docId){
        var def = $q.defer();

        table.getItem({Key: {docId: {S: String(docId)}}}, function(err, data){
          if (err) {
            // an error occurred
            console.log(err, err.stack)
            def.reject("Failed to get docLs");
          }
          else{
              var item = data.Item;
              var noteLs = [];
              if(item.noteLs != undefined){
                noteLs = item.noteLs.SS;
              }
              for(var i = 0; i < noteLs.length; i++){
                  noteLs[i] = parseInt(noteLs[i]);
              }
              var doc = {docId: parseInt(item.docId.S), text: item.text.S, noteLs: noteLs}
              def.resolve(doc);
          }
        });
        return def.promise;
    }

    var getDocLs = function(){
        var def = $q.defer();

        table.scan({}, function(err, data) {
          var docLs = [];
          if (err) {
            // an error occurred
            console.log(err, err.stack)
            def.reject("Failed to get docLs");
          }
          else{
              for(var i = 0; i < data.Items.length; i++){
                  var item = data.Items[i];
                  if(item.text !== undefined){
                    var noteLs = [];
                    if(item.noteLs !== undefined){
                        noteLs = item.noteLs.SS;
                    }
                    docLs.push({docId: parseInt(item.docId.S), text: item.text.S, noteLs: noteLs});
                  }
              }
              def.resolve(docLs);
          }
        });

        return def.promise;
    }

    var delDoc= function(doc){
        table.deleteItem({Key: {docId:{S: String(doc.docId)}}}, function(err, data) {
            if (err) console.log(err); // an error occurred
            else{
                console.log(data); // successful response
            }
        });
    }

    var addDoc = function(doc){
        doc.docId = docCnt;
        docCnt = docCnt + 1;
        setDocCnt(docCnt);
        updateDoc(doc);
        return doc;
    }

    var updateDoc = function(doc){
        if(doc.noteLs != undefined && doc.noteLs.length > 0){
            var noteLs = intArrToStrArr(doc.noteLs);
            var itemParams = {Item: {docId: {S: String(doc.docId)}, 
                                     text:  {S: doc.text},
                                     noteLs:{SS: noteLs}}};
            table.putItem(itemParams, function() {});
        }
        else{
            var itemParams = {Item: {docId: {S: String(doc.docId)}, 
                                     text:  {S: doc.text}}};
            table.putItem(itemParams, function() {});
        }

    }

    return {
        getDoc: getDoc,
        getDocLs:  getDocLs,
        getDocCnt: getDocCnt,
        setDocCnt: setDocCnt,
        addDoc: addDoc,
        delDoc: delDoc,
        updateDoc: updateDoc,
    };
});


app.factory('NoteService', function($q, $timeout, DocService) {
    var table = new AWS.DynamoDB({params: {TableName: 'Note'}});

    var setNoteCnt = function(cnt){
        var cntParams = {Item: {noteId: {S: 'Counter'}, 
                                 cnt:   {N: String(cnt)}}};

        table.putItem(cntParams, function() {});
    }

    var getNoteCnt = function(){
        var def = $q.defer();
        var key = "Counter"
        table.getItem({Key: {noteId: {S: key}}}, function(err, data) {
          if (err) {
            // an error occurred
            console.log(err, err.stack)
            def.reject("Failed to get noteLs");
          }
          else{
            console.log(data.Item); // print the item data
            var noteCnt = parseInt(data.Item.cnt.N);
            def.resolve(noteCnt);
          }
        });

        return def.promise;
    }

    var noteCnt;
    getNoteCnt().then(function(data){noteCnt = data});

    var getNote = function(noteId){
        var def = $q.defer();

        table.getItem({Key: {noteId: {S: String(noteId)}}}, function(err, data){
          if (err) {
            // an error occurred
            console.log(err, err.stack)
            def.reject("Failed to get docLs");
          }
          else{
              var item = data.Item;
              var note = {noteId: parseInt(item.noteId.S), text: item.text.S, pos: parseInt(item.pos.N)}
              def.resolve(note);
          }
        });
        return def.promise;
    }

    var getNoteLs = function(){
        var def = $q.defer();

        table.scan({}, function(err, data) {
          var noteLs = [];
          if (err) {
            // an error occurred
            console.log(err, err.stack)
            def.reject("Failed to get noteLs");
          }
          else{
              for(var i = 0; i < data.Items.length; i++){
                  var item = data.Items[i];
                  if(item.text !== undefined){
                    noteLs.push({noteId: parseInt(item.noteId.S), text: item.text.S, pos: parseInt(item.pos.N)});
                  }
                  else{
                    var noteCnt = parseInt(item.cnt.N);
                  }
              }
              noteLs.sort(function(a,b){return a.pos - b.pos;});
              def.resolve(noteLs);
          }
        });

        return def.promise;
    }

    var delNote = function(note){
        table.deleteItem({Key: {noteId:{S: String(note.noteId)}}}, function(err, data) {
            if (err) console.log(err); // an error occurred
            else{
                console.log(data); // successful response
            }
        });
    }

    var updateNote = function(note){
        var itemParams = {Item: {noteId: {S: String(note.noteId)}, 
                                 text:   {S: note.text},
                                 pos:    {N: String(note.pos)}}};

        table.putItem(itemParams, function() {});
    }

    var addNote = function(note){
        note.noteId = noteCnt;
        noteCnt += 1;
        setNoteCnt(noteCnt);
        updateNote(note);
        return note;
    }

    var getMessages = function() {
        var deferred = $q.defer();

        $timeout(function() {
            deferred.resolve([{noteId: '0', text:"hello yaya"}, {noteId: '1', text:"how are you"}, {noteId: '2', text:"thanks"}]);
        }, 2000);

        return deferred.promise;
    };

    return {
        getMessages: getMessages,
        getNote: getNote,
        getNoteLs: getNoteLs,
        getNoteCnt: getNoteCnt,
        setNoteCnt: setNoteCnt,
        addNote: addNote,
        delNote: delNote,
        updateNote: updateNote,
    };

})

app.controller('docCtrl', function ($window, $scope, $log, $location, DocService){
    //$scope.docLs = [{docId: 0, text:"hello yaya"}, {docId: 1, text:"how are you"}, {docId: 2, text:"thanks"}];
    $scope.focus = undefined;
    $scope.focusOn = function(pos){
        $scope.focus = pos;
    }
    $scope.getDocLs = function(){
    }
    $scope.addDoc = function(){
        var doc = DocService.addDoc({text: "new doc"});
        $scope.docLs.push(doc);
    }
    $scope.updateDoc = function(pos){
        DocService.updateDoc($scope.docLs[pos]);
    }
    $scope.delDoc = function(pos){
        DocService.delDoc($scope.docLs[pos]);
        $scope.docLs = remove($scope.docLs, pos);
    }
    $scope.editDoc = function(pos){
        // goto notebook.html
        $location.path("/note/"+String($scope.docLs[pos].docId));
    }
    DocService.getDocCnt().then(function(docCnt){
        $scope.docCnt = docCnt;
    })
    DocService.getDocLs().then(function(docLs){
        $scope.docLs = docLs;
    })
});

app.controller('noteCtrl', function ($window, $scope, $log, $routeParams, $location, NoteService, DocService){
    //$scope.noteLs = [{noteId: '0', text:"hello yaya"}, {noteId: '1', text:"how are you"}, {noteId: '2', text:"thanks"}];
    $scope.noteLs = [];
    $scope.focus = undefined;
    $scope.doc = undefined;
    $scope.docId = $routeParams.docId;
    console.log($scope.docId);
    $scope.docPage = function(){
        $location.path("/doc");
    }
    $scope.addNote = function(){
        var pos = $scope.noteLs.length;
        if($scope.focus !== undefined){
            pos = $scope.focus;
        }

        var newNote = NoteService.addNote({noteId: $scope.noteCnt, text: "new note", pos: pos, change: true});

        $scope.noteLs = insert($scope.noteLs, newNote, pos);
        $scope.doc.noteLs = insert($scope.doc.noteLs, newNote.noteId, pos);
        DocService.updateDoc($scope.doc);

        for(var i = pos; i < $scope.noteLs.length; i++){
            $scope.noteLs[i].pos = i;
            $scope.noteLs[i].change = true;
        }
        $scope.focus = pos;
    }
    $scope.focusOn = function(idx){
        if($scope.focus == idx){
            $scope.focus = undefined;
        }
        else{
            if($scope.focus !== undefined)
                $scope.uploadNote($scope.focus);
            $scope.focus = idx;
        }
    }
    $scope.deleteNote = function(){
        if($scope.focus !== undefined){
            var pos = $scope.focus;
            NoteService.delNote($scope.noteLs[pos]);
            $scope.noteLs = remove($scope.noteLs, pos);

            $scope.doc.noteLs = insert($scope.doc.noteLs, pos);
            DocService.updateDoc($scope.doc);

            $scope.$apply();
        }
    }
    $scope.uploadNote = function(pos){
        if($scope.noteLs[pos].change == true){
            var note = $scope.noteLs[pos];
            NoteService.updateNote(note);
        }
    }
    $scope.getNoteLs = function(docId){
        var promise = DocService.getDoc(docId).then(function(data){
            $scope.doc = data
        })
        promise.then(function(){
            if($scope.doc.noteLs.length > 0){
                for(var i = 0; i < $scope.doc.noteLs.length; i++){
                    NoteService.getNote($scope.doc.noteLs[i]).then(function(note){
                        $scope.noteLs.push(note);
                    });
                }
            }
        });
    }

    $scope.getNoteLs($scope.docId);
    //NoteService.getNoteLs().then(function(noteLs){
    //    $scope.noteLs = noteLs;
    //});
});

app.directive("mathjaxBind", function() {
    return {
        restrict: "A",
        controller: ["$scope", "$element", "$attrs", function($scope, $element, $attrs) {
            $scope.$watch($attrs.mathjaxBind, function(value) {
                var $script = angular.element("<div>")
                    .html(value == undefined ? "" : value);
                $element.html("");
                $element.append($script);
                //MathJax.Hub.Queue(["Reprocess", MathJax.Hub, $element[0]]);
                MathJax.Hub.Queue(["Typeset",MathJax.Hub,$element[0]]);
            });
        }]
    };
});

