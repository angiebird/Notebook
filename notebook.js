'use strict';
  MathJax.Hub.Config({
    showProcessingMessages: false,
    tex2jax: { inlineMath: [['$','$'],['\\(','\\)']] }
  });
MathJax.Hub.Configured();

var app = angular.module('notebook',['textAngular']);
app.controller('Ctrl', function ($window, $scope, $log){
    //$scope.noteLs = [{noteId: '0', text:"hello yaya"}, {noteId: '1', text:"how are you"}, {noteId: '2', text:"thanks"}];
    var table = new AWS.DynamoDB({params: {TableName: 'Note'}});
    $scope.noteLs = [];
    $scope.focus = undefined;
    $scope.noteCnt = undefined;
    $scope.addNote = function(){
        var pos = $scope.noteLs.length;
        if($scope.focus !== undefined){
            pos = $scope.focus;
        }
        var newNote = {noteId: $scope.noteCnt, text: "new note", pos: pos, change: true};
        $scope.noteLs = $scope.noteLs.slice(0, pos+1).concat([newNote].concat($scope.noteLs.slice(pos+1, $scope.noteLs.length)));
        for(var i = pos; i < $scope.noteLs.length; i++){
            $scope.noteLs[i].pos = i;
            $scope.noteLs[i].change = true;
        }
        $scope.noteCnt += 1;
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
            table.deleteItem({Key: {noteId:{S: String($scope.noteLs[pos].noteId)}}}, function(err, data) {
                if (err) console.log(err); // an error occurred
                else{
                    console.log(data); // successful response
                    $scope.noteLs = $scope.noteLs.slice(0, pos).concat($scope.noteLs.slice(pos+1, $scope.noteLs.length));
                    $scope.$apply();
                }
            });
        }
    }
    $scope.uploadNote = function(pos){
        if($scope.noteLs[pos].change == true){
            var itemParams = {Item: {noteId: {S: String($scope.noteLs[pos].noteId)}, 
                                     text:   {S: $scope.noteLs[pos].text},
                                     pos:    {N: String(pos)}}};
            table.putItem(itemParams, function() {});
            $scope.noteLs[pos].change == false;
        }
        var cntParams = {Item: {noteId: {S: 'Counter'}, 
                                 cnt:   {N: String($scope.noteCnt)}}};
        table.putItem(cntParams, function() {});
    }
    $scope.download= function(){
        table.scan({}, function(err, data) {
          if (err) console.log(err, err.stack); // an error occurred
          else{
              console.log(data);           // successful response
              for(var i = 0; i < data.Items.length; i++){
                  var item = data.Items[i];
                  if(item.text !== undefined){
                    $scope.noteLs.push({noteId: parseInt(item.noteId.S), text: item.text.S, pos: parseInt(item.pos.N)});
                  }
                  else{
                    var noteCnt = parseInt(item.cnt.N);
                    $scope.noteCnt = noteCnt;
                  }
              }
              $scope.noteLs.sort(function(a,b){return a.pos - b.pos;});
              $scope.$apply();
          }
        });
    }
    $scope.download();
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

