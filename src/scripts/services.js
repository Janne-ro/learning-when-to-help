var tutorServices = angular.module("learningEnvApp.services", []);

tutorServices.service("User", function($http) {
    var resp = {
        //Time stamps to keep track of when each section started
        startTimePretest: 0,
        startTimeTask1_1: 0,
        startTimeTask1_2: 0,
        startTimeTask1_3: 0,
        startTimeTask2_1: 0,
        startTimeTask2_2: 0,
        startTimeTask2_3: 0,
        startTimeTask3_1: 0,
        startTimeTask3_2: 0,
        startTimeTask3_3: 0,
        startTimeSelfTask: 0,
        startTimePosttest: 0,
        endTimePosttest:0,
        //times needed --> will be calculated later
        timeNeededPretest: 0,
        timeNeededTask1_1: 0,
        timeNeededTask1_2: 0,
        timeNeededTask1_3: 0,
        timeNeededTask2_1: 0,
        timeNeededTask2_2: 0,
        timeNeededTask2_3: 0,
        timeNeededTask3_1: 0,
        timeNeededTask3_2: 0,
        timeNeededTask3_3: 0,
        timeNeededSelfTask: 0,
        timeNeededPosttest: 0,
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
        selfEvalScore: 0,
        selfEvalReflection: "",
        performanceSelfTask: 0
    };

    //Getters and Setters
    //Time stamps
    this.setStartTimePretest = function(value) { resp.startTimePretest = value; };
    this.getStartTimePretest = function() { return resp.startTimePretest; };

    this.setStartTimeTask1_1 = function(value) { resp.startTimeTask1_1 = value; };
    this.getStartTimeTask1_1 = function() { return resp.startTimeTask1_1; };

    this.setStartTimeTask1_2 = function(value) { resp.startTimeTask1_2 = value; };
    this.getStartTimeTask1_2 = function() { return resp.startTimeTask1_2; };

    this.setStartTimeTask1_3 = function(value) { resp.startTimeTask1_3 = value; };
    this.getStartTimeTask1_3 = function() { return resp.startTimeTask1_3; };

    this.setStartTimeTask2_1 = function(value) { resp.startTimeTask2_1 = value; };
    this.getStartTimeTask2_1 = function() { return resp.startTimeTask2_1; };

    this.setStartTimeTask2_2 = function(value) { resp.startTimeTask2_2 = value; };
    this.getStartTimeTask2_2 = function() { return resp.startTimeTask2_2; };

    this.setStartTimeTask2_3 = function(value) { resp.startTimeTask2_3 = value; };
    this.getStartTimeTask2_3 = function() { return resp.startTimeTask2_3; };

    this.setStartTimeTask3_1 = function(value) { resp.startTimeTask3_1 = value; };
    this.getStartTimeTask3_1 = function() { return resp.startTimeTask3_1; };

    this.setStartTimeTask3_2 = function(value) { resp.startTimeTask3_2 = value; };
    this.getStartTimeTask3_2 = function() { return resp.startTimeTask3_2; };

    this.setStartTimeTask3_3 = function(value) { resp.startTimeTask3_3 = value; };
    this.getStartTimeTask3_3 = function() { return resp.startTimeTask3_3; };

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
    this.setSelfEvalScore = function(value) { resp.selfEvalScore = value; };
    this.getSelfEvalScore = function() { return resp.selfEvalScore; };

    this.setSelfEvalReflection = function(value) { resp.selfEvalReflection = value; };
    this.getSelfEvalReflection = function() { return resp.selfEvalReflection; };

    this.setPerformanceSelfTask = function(value) { resp.performanceSelfTask = value; };
    this.getPerformanceSelfTask = function() { return resp.performanceSelfTask; };

    //Utility
    this.getResponse = function() { return resp; };

    function minutes(a, b) {
        return ((b - a) / 60000).toFixed(2);
    }

    //Save the response to csv
    this.save = function() {
        //calculate the time needed on tasks
        resp.timeNeededPretest = minutes(resp.startTimeTask1_1 - resp.startTimePretest)
        resp.timeNeededTask1_1 = minutes(resp.startTimeTask1_2 - resp.startTimeTask1_1)
        resp.timeNeededTask1_2 = minutes(resp.startTimeTask1_3 - resp.startTimeTask1_2)
        resp.timeNeededTask1_3 = minutes(resp.startTimeTask2_1 - resp.startTimeTask1_3)
        resp.timeNeededTask2_1 = minutes(resp.startTimeTask2_2 - resp.startTimeTask2_1)
        resp.timeNeededTask2_2 = minutes(resp.startTimeTask2_3 - resp.startTimeTask2_2)
        resp.timeNeededTask2_3 = minutes(resp.startTimeTask3_1 - resp.startTimeTask2_3)
        resp.timeNeededTask3_1 = minutes(resp.startTimeTask3_2 - resp.startTimeTask3_1)
        resp.timeNeededTask3_2 = minutes(resp.startTimeTask3_3 - resp.startTimeTask3_2)
        resp.timeNeededTask3_3 = minutes(resp.startTimeSelfTask - resp.startTimeTask3_3)
        resp.timeNeededSelfTask = minutes(resp.startTimePosttest - resp.startTimeSelfTask)
        resp.timeNeededPosttest = minutes(resp.endTimePosttest - resp.startTimePosttest)

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
