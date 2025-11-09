var tutorServices = angular.module("tutor.services", []);

tutorServices.service("User", function($http) {
    var resp = {
        startTime: 0,
        endTime: 0,
        education: "",
        gender: "",
        age: "",
        testType: "",
        pre: [],
        post: []
    };

    this.setGender = function(value) {
        resp.gender = value;
    };

    this.setAge = function(value) {
        resp.age = value;
    };

    this.setEducation = function(value) {
        resp.education = value;
    };

    this.setTestType = function(value) {
        resp.testType = value;
    };


    this.getResponse = function() {
        return resp;
    };

    this.getAnxiety = function() {
        return resp.pretestPoints;
    };

    this.getCulture = function(){
        return resp.culture;
    }

    this.setPre = function(value) {
        resp.pre = value;
    };

    this.setPost = function(value) {
        resp.post = value;
    };

    this.setStartTime = function(value) {
        resp.startTime = value;
    };

    this.setEndTime = function(value) {
        resp.endTime = value;
    };

    this.save = function() {
        $http({
            url: "/save-response",
            dataType: "csv",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Custom-Header": JSON.stringify(resp)
            },
            data: resp
        }).then(function(response) {
            // success
            console.log("response sent!");

        }, function(response) {
            // failed
            console.error("Failed to submit participant response. " + response);
        });
    };

});
