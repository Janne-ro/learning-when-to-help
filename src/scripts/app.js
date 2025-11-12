// with ngAnimate/ngAria included (recommended)
var app = angular.module('learningEnvApp', ['ngMaterial', 'ngRoute', 'ngAnimate', 'ngAria', 'learningEnvApp.services' ]);

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

//Create a wrapper directive for the canvas gauge
angular.module('learningEnvApp')
.directive('canvasGauge', function() {
  return {
    restrict: 'E',
    scope: {
      value: '=',
      min: '@?',
      max: '@?',
      units: '@?',
      width: '@?',
      height: '@?',
      majorTicks: '@?',
      underColor: '@?',   // NEW
      overColor: '@?',    // NEW
      mask: '@?'          // NEW
    },
    template: '<div class="canvas-gauge-wrapper"></div>',
    link: function(scope, elem) {
      var canvas = document.createElement('canvas');
      elem[0].querySelector('.canvas-gauge-wrapper').appendChild(canvas);

      var opts = {
        renderTo: canvas,
        width: scope.width ? parseInt(scope.width, 10) : 200,
        height: scope.height ? parseInt(scope.height, 10) : 200,
        minValue: scope.min ? parseFloat(scope.min) : 0,
        maxValue: scope.max ? parseFloat(scope.max) : 100,
        units: scope.units || '',
        majorTicks: scope.majorTicks ? scope.majorTicks.split(',') : [0,2,4,6,8,10],
        value: scope.value || 0,
        valueBox: true,
        animationRule: "linear",
        animationDuration: 300,
        colorPlate: "#fff",                 // default plate color
        colorValueText: "#000"              // default text color
      };

      // Apply new optional attributes
      if (scope.underColor) opts.colorUnits = scope.underColor;
      if (scope.overColor) opts.highlights = [{ from: 0, to: opts.maxValue || 100, color: scope.overColor }];
      if (scope.mask) opts.valueInt = false, opts.valueFormat = scope.mask;

      // create the gauge
      var gauge = new RadialGauge(opts).draw();

      // Watch for value changes
      scope.$watch('value', function(newVal) {
        if (newVal != null && !isNaN(newVal)) gauge.value = newVal;
      });

      // Cleanup
      scope.$on('$destroy', function() {
        if (gauge && gauge.destroy) gauge.destroy();
      });
    }
  };
});