var tutorServices = angular.module("tutor.services", []);

tutorServices.service("User", function($http) {
    var resp = {
        //Time stamps to keep track of when each section started
        startTimePretest: 0,
        startTimeTask1: 0,
        startTimeTask2: 0,
        startTimeTask3: 0,
        startTimeSelfTask: 0,
        startTimePosttest: 0,
        endTimePosttest:0,
        //GenAI log for each task 
        queriesTask1: [],
        queriesTask2: [],
        queriesTask3: [],
        //Demographic data
        education: "",
        gender: "",
        age: "",
        //The codition of the participant
        testType: "",
        //Responses to pre- and posttest saved as ordered lists
        pre: [],
        post: [],
        //Self evaluation and performance for the last task
        selfEval: 0,
        performanceSelfTask: 0
    };

    //Getters and Setters
    //Time stamps
    this.setStartTimePretest = function(value) { resp.startTimePretest = value; };
    this.getStartTimePretest = function() { return resp.startTimePretest; };

    this.setStartTimeTask1 = function(value) { resp.startTimeTask1 = value; };
    this.getStartTimeTask1 = function() { return resp.startTimeTask1; };

    this.setStartTimeTask2 = function(value) { resp.startTimeTask2 = value; };
    this.getStartTimeTask2 = function() { return resp.startTimeTask2; };

    this.setStartTimeTask3 = function(value) { resp.startTimeTask3 = value; };
    this.getStartTimeTask3 = function() { return resp.startTimeTask3; };

    this.setStartTimeSelfTask = function(value) { resp.startTimeSelfTask = value; };
    this.getStartTimeSelfTask = function() { return resp.startTimeSelfTask; };

    this.setStartTimePosttest = function(value) { resp.startTimePosttest = value; };
    this.getStartTimePosttest = function() { return resp.startTimePosttest; };

    this.setEndTimePosttest = function(value) { resp.endTimePosttest = value; };
    this.getEndTimePosttest = function() { return resp.endTimePosttest; };

    //GenAI logs
    this.setQueriesTask1 = function(value) { resp.queriesTask1 = value; };
    this.getQueriesTask1 = function() { return resp.queriesTask1; };

    this.setQueriesTask2 = function(value) { resp.queriesTask2 = value; };
    this.getQueriesTask2 = function() { return resp.queriesTask2; };

    this.setQueriesTask3 = function(value) { resp.queriesTask3 = value; };
    this.getQueriesTask3 = function() { return resp.queriesTask3; };

    //Demographic data
    this.setEducation = function(value) { resp.education = value; };
    this.getEducation = function() { return resp.education; };

    this.setGender = function(value) { resp.gender = value; };
    this.getGender = function() { return resp.gender; };

    this.setAge = function(value) { resp.age = value; };
    this.getAge = function() { return resp.age; };

    //Participant condition
    this.setTestType = function(value) { resp.testType = value; };
    this.getTestType = function() { return resp.testType; };

    //Pre/Post test responses
    this.setPre = function(value) { resp.pre = value; };
    this.getPre = function() { return resp.pre; };

    this.setPost = function(value) { resp.post = value; };
    this.getPost = function() { return resp.post; };

    //Self evaluation and performance
    this.setSelfEval = function(value) { resp.selfEval = value; };
    this.getSelfEval = function() { return resp.selfEval; };

    this.setPerformanceSelfTask = function(value) { resp.performanceSelfTask = value; };
    this.getPerformanceSelfTask = function() { return resp.performanceSelfTask; };

    //Utility
    this.getResponse = function() { return resp; };

    //Save the response to csv
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
