// with ngAnimate/ngAria included (recommended)
var app = angular.module('learningEnvApp', ['ngMaterial', 'ngRoute', 'ngAnimate', 'ngAria', 'learningEnvApp.services']);

// minification-safe config using array-annotation
app.config(['$routeProvider', '$mdThemingProvider', function($routeProvider, $mdThemingProvider) {
  $routeProvider
    .when('/pretest', {
      templateUrl: 'src/views/pretest.html',
      controller: 'PretestCtrl'
    })
    .when('/task1', {
      templateUrl: 'src/views/task1.html',
      controller: 'Task1Ctrl'
    })
    .when('/task2', {
      templateUrl: 'src/views/task2.html',
      controller: 'Task2Ctrl'
    })
    .when('/task3', {
      templateUrl: 'src/views/task3.html',
      controller: 'Task3Ctrl'
    })
    .when('/posttest', {
      templateUrl: 'src/views/posttest.html',
      controller: 'PosttestCtrl'
    })
    .otherwise({
      redirectTo: '/pretest'
    });

  // Define used theme - this call needs $mdThemingProvider which is available in config
  $mdThemingProvider.theme('default')
    .primaryPalette('blue-grey')
    .accentPalette('blue-grey')
    .warnPalette('blue-grey');
}]);
