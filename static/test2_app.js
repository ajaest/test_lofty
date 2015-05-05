'use strict';

(function () {
    
    var test_2_module = angular.module('test2', ['ngRoute', 'ngResource']);

    test_2_module.config(['$routeProvider', function($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: '/static/partials/home.html',
                controller : 'homeController' 
            })
            .when('/submissions/', {
                templateUrl: '/static/partials/submissions.html',
                controller : 'submissionsController' 
            })
            .when('/logout/', {
                controller: 'logoutController',
                template  : 'You were logged out.'
            })
    }]);

    test_2_module
    .factory('Submission', (['$resource'],  function (auth, $resource) {
        
        return $resource('/rest/v1/submissions/:id', {id:"@id"});
    }));

    test_2_module
    .factory('auth', (['$q', '$http', '$rootScope'], function ($q, $http, $rootScope) {
        var _token = null;

        var auth_token_info = {
            get token(){
                return _token;
            },
            set token(value){
                if (value==null || value==undefined){
                    delete $http.defaults.headers.common['auth-token'];
                    delete this.username;
                }
                else
                    $http.defaults.headers.common['auth-token'] = value;

                _token = value;
            },

            login : function (username, password){
                var self  = this      ;
                var defer = $q.defer();

                $http.post(
                    '/rest/v1/token', 
                    {username: username, password: password}
                )
                .success(function (data){
                    self.token    = data.token;
                    self.username = username  ;
                    defer.resolve(data.token);
                })
                .error(function (data){
                    defer.reject(data.message);
                });
            }
        };

        // Make the auth object available to all scopes
        $rootScope.auth = auth_token_info;

        return auth_token_info;
    }));


    test_2_module
    .controller('homeController', (['$scope', 'Submission'], function ($scope, Submission) {

        $scope.submission_message = "Please input here your message";
        $scope.createSubmission   = function (){
            Submission.save({text: $scope.submission_message}, 
                function (data) {
                    $scope.message = "Created submission with id " + data.id + "!";
                },
                function (error) {
                    $scope.message = "Could not create submission.";
                }
            );
        }
    }));

    test_2_module
    .controller('logoutController', (['auth', '$location'], function (auth, $location){
        auth.token = null;
    }));

    test_2_module
    .controller('submissionsController', (['$scope', 'Submission'], function ($scope, Submission) {
        Submission.query(
            function (data){
                $scope.submissions = data;
            }
        );
    }));

})();
