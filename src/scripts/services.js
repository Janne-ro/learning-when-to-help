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
        startTimeDistractor: 0,
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
        timeNeededDistractor: 0,
        timeNeededSelfTask: 0,
        timeNeededPosttest: 0,
        //how often failed on each task
        timesFailedTask1_1: 0,
        timesFailedTask1_2: 0,
        timesFailedTask1_3: 0,
        timesFailedTask2_1: 0,
        timesFailedTask2_2: 0,
        timesFailedTask2_3: 0,
        timesFailedTask3_1: 0,
        timesFailedTask3_2: 0,
        timesFailedTask3_3: 0,
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

    this.setStartTime = function(value) { resp.startTimeTask3_3 = value; };
    this.getStartTimeTask3_3 = function() { return resp.startTimeTask3_3; };

    this.setStartTimeDistractor = function(value) { resp.startTimeSelfTask = value; };
    this.getStartTimeDistractor = function() { return resp.startTimeSelfTask; };

    this.setStartTimeSelfTask = function(value) { resp.startTimeSelfTask = value; };
    this.getStartTimeSelfTask = function() { return resp.startTimeSelfTask; };

    this.setStartTimePosttest = function(value) { resp.startTimePosttest = value; };
    this.getStartTimePosttest = function() { return resp.startTimePosttest; };

    this.setEndTimePosttest = function(value) { resp.endTimePosttest = value; };
    this.getEndTimePosttest = function() { return resp.endTimePosttest; };

    //times failed
    this.setTimesFailedTask1_1 = function(value) { resp.timesFailedTask1_1 = value; };
    this.getTimesFailedTask1_1 = function() { return resp.timesFailedTask1_1; };

    this.setTimesFailedTask1_2 = function(value) { resp.timesFailedTask1_2 = value; };
    this.getTimesFailedTask1_2 = function() { return resp.timesFailedTask1_2; };

    this.setTimesFailedTask1_3 = function(value) { resp.timesFailedTask1_3 = value; };
    this.getTimesFailedTask1_3 = function() { return resp.timesFailedTask1_3; };

    this.setTimesFailedTask2_1 = function(value) { resp.timesFailedTask2_1 = value; };
    this.getTimesFailedTask2_1 = function() { return resp.timesFailedTask2_1; };

    this.setTimesFailedTask2_2 = function(value) { resp.timesFailedTask2_2 = value; };
    this.getTimesFailedTask2_2 = function() { return resp.timesFailedTask2_2; };

    this.setTimesFailedTask2_3 = function(value) { resp.timesFailedTask2_3 = value; };
    this.getTimesFailedTask2_3 = function() { return resp.timesFailedTask2_3; };

    this.setTimesFailedTask3_1 = function(value) { resp.timesFailedTask3_1 = value; };
    this.getTimesFailedTask3_1 = function() { return resp.timesFailedTask3_1; };

    this.setTimesFailedTask3_2 = function(value) { resp.timesFailedTask3_2 = value; };
    this.getTimesFailedTask3_2 = function() { return resp.timesFailedTask3_2; };

    this.setTimesFailedTask3_3 = function(value) { resp.timesFailedTask3_3 = value; };
    this.getTimesFailedTask3_3 = function() { return resp.timesFailedTask3_3; };

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

    function seconds(a, b) {
        return ((b - a) / 1000).toFixed(1); //return seconds with one decimal
    }

    this.save = function() {
        //calculate timeNeeded using minutes
        resp.timeNeededPretest   = seconds(resp.startTimePretest, resp.startTimeTask1_1);
        resp.timeNeededTask1_1   = seconds(resp.startTimeTask1_1, resp.startTimeTask1_2);
        resp.timeNeededTask1_2   = seconds(resp.startTimeTask1_2, resp.startTimeTask1_3);
        resp.timeNeededTask1_3   = seconds(resp.startTimeTask1_3, resp.startTimeTask2_1);
        resp.timeNeededTask2_1   = seconds(resp.startTimeTask2_1, resp.startTimeTask2_2);
        resp.timeNeededTask2_2   = seconds(resp.startTimeTask2_2, resp.startTimeTask2_3);
        resp.timeNeededTask2_3   = seconds(resp.startTimeTask2_3, resp.startTimeTask3_1);
        resp.timeNeededTask3_1   = seconds(resp.startTimeTask3_1, resp.startTimeTask3_2);
        resp.timeNeededTask3_2   = seconds(resp.startTimeTask3_2, resp.startTimeTask3_3);
        resp.timeNeededTask3_3   = seconds(resp.startTimeTask3_3, resp.startTimeDistractor);
        resp.timeNeededDistractor= seconds(resp.startTimeDistractor, resp.startTimeSelfTask);
        resp.timeNeededSelfTask  = seconds(resp.startTimeSelfTask, resp.startTimePosttest);
        resp.timeNeededPosttest  = seconds(resp.startTimePosttest, resp.endTimePosttest);

        // POST JSON in the body
        $http.post("http://localhost:4000/save-response", resp)
        .then(function(response) {
            console.log("response sent!", response.data);
        })
        .catch(function(error) {
            // Show as much useful debugging info as possible:
            console.error("Failed to submit participant response.");
            console.error("status:", error.status, error.statusText);
            console.error("data:", error.data);
            console.error("headers:", error.headers());
            console.error("config.url:", error.config && error.config.url);
        });
    };
});
