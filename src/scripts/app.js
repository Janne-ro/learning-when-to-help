var app = angular.module('learningEnvApp', ['ngMaterial', 'ngRoute']);

app.config(function($routeProvider) {
  $routeProvider
    .when('/pretest', {
      templateUrl: 'views/pretest.html',
      controller: 'PretestCtrl'
    })
    .when('/task1', {
      templateUrl: 'views/task1.html',
      controller: 'Task1Ctrl'
    })
    .when('/task2', {
      templateUrl: 'views/task2.html',
      controller: 'Task2Ctrl'
    })
    .when('/task3', {
      templateUrl: 'views/task3.html',
      controller: 'Task3Ctrl'
    })
    .when('/posttest', {
      templateUrl: 'views/posttest.html',
      controller: 'PosttestCtrl'
    })
    .otherwise({
      redirectTo: '/pretest'
    });
});
