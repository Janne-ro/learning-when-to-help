app.controller('Task4Ctrl', function($scope, $sce, User, $location, $http, $timeout) {

    //questions for unassisted task 4
    $scope.questions = [
        {
            prompt: "According to the workshop, why are “middle-rung” social contacts often more likely to trigger harmful comparison than close friends or celebrities?",
            options: [
                "Because middle-rung contacts post more often than celebrities or close friends.",
                "Because we assume middle-rung contacts’ posts are truthful and we lack context to judge them.",
                "Because middle-rung contacts are by definition physically more attractive or successful.",
                "Because algorithms prioritize posts from middle-rung contacts over others.",
                "Because we know close friends well enough to see through their idealized posts, and we know celebrities’ posts are staged, but middle-rung contacts fall in between."
            ],
            correctIndices: [1, 4]
        },
        {
            prompt: "According to the workshop, which statements are true about self-image?",
            options: [
                "Self-image can be influenced by social media use.",
                "Self-image includes how others perceive you, but not how you think they perceive you.",
                "Comparing my grades to my peers is an example of social comparison.",
                "Comparing two historic figures is an example of social comparison.",
                "Self-image is a subjective state that amongst other things depends upon emotions."
            ],
            correctIndices: [0, 2, 4]
        },
        {
            prompt: "According to the workshop, which statements are true about social media usage and comparisons?",
            options: [
                "People are most affected by comparisons with celebrities rather than friends or acquaintances.",
                "Social media allows users to carefully curate what they show, which can affect how they see themselves.",
                "Passive scrolling is linked to worse self-image outcomes than active posting and interacting.",
                "Platform features, algorithms, and user culture work independently and do not influence each other.",
                "Social media can also provide access to supportive communities and resources not otherwise available."
            ],
            correctIndices: [1, 2, 4]
        },
        {
            prompt: "According to the workshop, which statements are true about social media features?",
            options: [
                "Likes can influence how we see ourselves, because we might compare our like counts to others.",
                "Using emojis in comments can completely negate the ambiguity of such messages.",
                "Hashtags like #nofilter can create a misleading sense of authenticity.",
                "Instagram stories are designed to feel more casual than the main feed.",
                "If someone uploads a photo using a filter they have to mark it accordingly.",
            ],
            correctIndices: [0, 2, 3]
        },
        {
            prompt: "According to the workshop, which statements are true about social media algorithms?",
            options: [
                "If someone interacts with sport posts for some time, they might see more sports posts in the future.",
                "A recommendation spiral can lead to more relevant and diverse content being crowded out.",
                "When users interact with negative or distressing content, the system reduces similar recommendations to prevent emotional overload.",
                "Most platforms now use emotional-balance scoring, which detects your mood from your scrolling patterns and shows content designed to lift your spirits.",
                "Social media algorithms tend to change their behavior rapidly to limit the effect of recommendation spirals."
            ],
            correctIndices: [0, 1]
        },
        {
            prompt: "According to the workshop, which statements are true about social media culture?",
            options: [
                "The culture of the platform only has a small effect on our self-image.",
                "The “highlight reel” effect describes that users tend to post only the best, happiest, or most flattering moments of their lives.",
                "The “highlight reel” effect can influence your sense of what’s normal.",
                "Identity and self-worth of a person can clearly be identified by looking deeply at their social media profile and behavior.",
                "The rule that influencers have to label sponsored content is intended to standardize influencer “ad personas”."
            ],
            correctIndices: [1, 2]
        },
        {
            prompt: "According to the workshop, which statements are true about taking breaks from social media?",
            options: [
                "Taking a temporary break can help interrupt patterns of comparison or overexposure.",
                "Deleting an app is always permanent and should never be reversed.",
                "Removing an app temporarily can help some people feel more grounded before returning.",
                "Research indicates that taking a break from social media is only useful if it is longer than a month.",
                "Pausing app use guarantees that negative feelings about self-image will disappear completely."
            ],
            correctIndices: [1, 3]
        },
        {
            prompt: "According to the workshop, which statements are true about strategies to deal with negative influencese of social media?",
            options: [
                "For a specific user, all social media platforms affect them in the same way.",
                "Setting time limits can prevent extended scrolling that leaves you feeling drained.",
                "Small adjustments in online behavior can help you continue enjoying social media while protecting self-image.",
                "Reducing exposure to certain content automatically improves your real-life relationships.",
                "Improving your self-image through social media usage always requires drastic changes."
            ],
            correctIndices: [1, 2]
        },
        {
            prompt: "According to the workshop, which statements are true about algorithms and feed management?",
            options: [
                "Algorithms tend to reinforce content that you interact with, even just once.",
                "Using “see fewer posts” or “hide” functions helps prevent unhelpful recommendation spirals.",
                "Hiding posts will automatically remove similar content from your friends/contacts user feeds.",
                "Carefully curating your feed can reduce exposure to content that triggers negative feelings.",
                "The platform “rewards” users who hide posts by giving them more positive content automatically."
            ],
            correctIndices: [0, 1, 3]
        }
    ];

    //initialize selected options
    $scope.selectedOptions = [];
    $scope.questions.forEach(function(q, i) {
        $scope.selectedOptions[i] = new Array(q.options.length).fill(false);
    });

    //helper function for checking correctness
    function isAnswerCorrect(qIndex) {
        var selected = [];
        //check which options were selected
        $scope.selectedOptions[qIndex].forEach(function(val, idx) {
            if (val){
                selected.push(idx);
            } 
        });

        //sort both arrays for easier comparison
        selected.sort();

        var correct = $scope.questions[qIndex].correctIndices.slice().sort();

        //check length first
        if (selected.length !== correct.length){
            return false;
        }

        //check individual entries
        for (var i = 0; i < selected.length; i++) {
            if (selected[i] !== correct[i]){
                return false;
            }   
        }
        return true;
    }

    //submit all answers
    $scope.submitTask = function() {

        //variable to count correct answers
        var correctCount = 0;

        //check each question for correctness
        $scope.questions.forEach(function(q, i) {
            if (isAnswerCorrect(i)){
                correctCount++;
            }
        });

        console.log("Task 4 completed.");
        User.setPerformanceSelfTask(correctCount);
        console.log("Number of correct answers:", correctCount);

        //set start time for posttest
        User.setStartTimePosttest(new Date().getTime());

        // proceed regardless of correctness
        $location.path("/posttest");
    };
});
