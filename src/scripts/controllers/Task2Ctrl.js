
//Controller for Task 2
app.controller('Task2Ctrl', function($scope, $sce, User, $location, $http, $timeout) {

    //scroll to the top after loading page
    $timeout(function () {
        window.scrollTo(0, 0);
    }, 0);

    //Get test type (already implemented elsewhere)
    const testType = User.getTestType();

    //Set allow ai flag based on test type
    $scope.allowAI = false; 

    //Display different messages based on test type
    if (testType === "never") {
        $scope.aiMessage = "You are not allowed to use generative AI for this task";
        $scope.allowAI = false; 
    } else if (testType === "RL") {
        $scope.aiMessage = "You are currently not allowed to use generative AI for this task. In the future this might change";
        $scope.allowAI = false; 
    } else if (testType === "always") {
        $scope.aiMessage = "You are allowed to use generative AI for this task";
        $scope.allowAI = true;
    } else {
        $scope.aiMessage = "AI usage status is undefined."; //Should never happen
        $scope.allowAI = true; //--> should usually be set to false or even better deleted (for testing always true)
    }

    //set the text of the task
    $scope.task2Text= `<p>
        Over the past decade, social media platforms have steadily evolved from simple photo-sharing tools 
        into complex ecosystems shaped by design features, algorithms, and user culture. Each component influences 
        how people behave online and, in turn, how they feel about themselves.
        </p>    

        <p>
        <strong>Platform Features</strong> 
        <br> Social media applications offer a wide range of interactive elements that shape communication, 
        visibility, and self-presentation. For instance, the like button makes the popularity of each post 
        immediately visible. While it appears to be a harmless form of feedback, it can make users acutely aware 
        not only of how well a post performs, but also often unintentionally how their popularity compares to 
        that of people around them. The share function spreads content instantly, turning private moments into 
        widely circulated posts. Comment sections add another layer: They allow others to praise, critique, or 
        react, yet the tone of comments is often ambiguous, and misunderstandings are common.
        </p>

        <p>
        Hashtags operate as navigational tools, helping users find clusters of similar content. However, tags like 
        #nofilter can create a misleading sense of authenticity, implying an unedited reality even when the image 
        has been curated or subtly enhanced. Filters themselves typically focus on enhancing or correcting images 
        rather than transforming them dramatically. Because they adjust lighting or smooth skin while keeping the 
        overall image plausible, filtered photos are often perceived as more “real” than they actually are. Sometimes 
        platforms will also add features. For instance, because of the pressure to look “perfect”, many users would 
        only post one or two photos each day, which meant the app made less money because users saw fewer ads. This 
        is why Instagram introduced “Stories,” which were designed to feel more casual than the main feed.
        </p>

        <p>
        <strong>Algorithms</strong>
        <br>Alongside these features sits the recommendation algorithm, an engine designed to maximize engagement. When users 
        interact with posts by pausing, liking, or commenting the algorithm infers interests and pushes more content in that 
        direction. If someone interacts with posts about weight loss, for example, they may find their feed increasingly 
        filled with dieting content, advertisements for slimming products, and similarly themed posts. Crucially, this effect 
        can persist long after the user stops engaging with such material. 
        </p>

        <p>
        Over time, this can produce what researchers call a recommendation spiral. A narrowing set of topics 
        gradually dominates the feed, sometimes crowding out healthier or more diverse content. Explore pages 
        often intensify this dynamic by surfacing highly curated images, frequently featuring idealized bodies 
        or lifestyles. Because the system tries to show users “more of what they looked at, even once,” people 
        can become overloaded with content that they find unhelpful, unrealistic, or even distressing. It also 
        contributes to creating bubbles of content where your political beliefs get repeated back to you over 
        and over again in a non-reflective manner. This can create an effect where you believe that an 
        unproportionate amount of people shares your perspectives. 
        </p>
        
        <p>
        <strong>Culture</strong>
        <br>Finally, the culture of the platform shapes how users interpret and participate in these environments. On many platforms, 
        people follow a mix of close friends, acquaintances, and influencers, which blurs the line between everyday life and 
        celebrity standards. As a result, individuals may feel pressure to live up to idealized presentations of beauty, success, or fun.
        A common norm is the “highlight reel” effect. It describes that users tend to post only the best, happiest, or most 
        flattering moments of their lives, creating a distorted sense of what is typical. Yet identity and self-worth are more 
        complex than any online profile. People derive confidence from different areas, such as hobbies, academic achievements, 
        friendships, and family relationships, which can be imagined as slices of a pie chart representing diverse sources of well-being.
        <\p>

        <p>
        It is also important to remember that not everything online is spontaneous. Influencers and bloggers in the EU,
        for example, are required to clearly label sponsored content under regulations from bodies. This rule is intended 
        to help viewers recognize when posts are promotional rather than purely personal.
        <\p>
        `;

    //set scope variable for HTML binding and trust it
    $scope.task2Content = $sce.trustAsHtml($scope.task2Text);

    //variable that holds LLM/chat state
    $scope.llm = {
        prompt: '',
        loading: false,
        error: '',
        systemPrompt: "You are an helpfull and friendly AI assitance who supports students by giving them the answer to questions regarding this text (they always have 2 or 3 correct answers in a multiple choice setting). Dont talk about other things and firendly lead them back to the text. Also never include * in your answer: \n" + $scope.task2Text,   // one-time system prompt
    };

    //Array of chat messages (can be deleted by clear chat)
    //each message has: { who: 'user'|'ai', text: '...' }
    $scope.messages = [];

    //create variable for overall ai messages (including clear chat commands) --> different from scope.messages only in that sense
    var humanAIInteraction = [];

    //backend URL on which the llm api is hosted
    var backendUrl = 'http://localhost:8080/api/ask-ai'; 

    //helper function that scrolls to the bottom
    function scrollToBottom(delay) {
        //give DOM a tick to render
        $timeout(function() {
            var el = document.getElementById('llm-messages');
            if (el) {
                el.scrollTop = el.scrollHeight;
            }
        }, delay || 50);
    }

    //send the message to the LLM
    $scope.sendToLLM = function() {
        var text = ($scope.llm.prompt || '').trim();
        if (!text) {
            $scope.llm.error = 'Please type something to send.';
            return;
        }

        // push user message locally (so that the UI shows it immediately)
        $scope.messages.push({ who: 'user', text: text });
        humanAIInteraction.push({ who: 'user', text: text });

        $scope.llm.prompt = '';
        $scope.llm.loading = true;
        $scope.llm.error = '';
        scrollToBottom(0);

        //build messages array for LLM: map local roles to model roles.
        //convert 'ai' -> 'assistant', 'user' -> 'user', 'system' -> 'system' to not confuse the LLM when pushing to history
        const messagesForLLM = humanAIInteraction.map(m => {
            let role = (m.who === 'ai') ? 'assistant' : (m.who === 'system') ? 'system' : 'user';
            return { role: role, content: m.text };
        });

        //ensure the system prompt is included at the start
        //this prevents accidentally losing instruction when clearing or page load.
        if ($scope.llm.systemPrompt && $scope.llm.systemPrompt.trim() !== '') {
            if (!messagesForLLM.length || messagesForLLM[0].role !== 'system' || messagesForLLM[0].content !== $scope.llm.systemPrompt) {
                messagesForLLM.unshift({ role: 'system', content: $scope.llm.systemPrompt });
            }
        }

        // post to backend: send the full messages array as context
        const payload = { messages: messagesForLLM };

        $http.post(backendUrl, payload)
        .then(function(res) {
            var reply = (res.data && res.data.reply) ? res.data.reply : '(no reply)';
            $scope.messages.push({ who: 'ai', text: reply });
            humanAIInteraction.push({ who: 'ai', text: reply });
        })
        .catch(function(err) {
            console.error('LLM call failed:', err);
            var errMsg = (err && err.data && err.data.error) ? err.data.error : 'AI service error';
            $scope.messages.push({ who: 'ai', text: 'Error: ' + errMsg });
            humanAIInteraction.push({ who: 'ai', text: 'Error: ' + errMsg });
        })
        .finally(function() {
            $scope.llm.loading = false;
            scrollToBottom(120);
        });
    };


    //enter to send, Shift+Enter newline
    $scope.handleKeydown = function(event) {
        if (event.keyCode === 13 && !event.shiftKey) {
            event.preventDefault();
            $scope.sendToLLM();
        }
    };

    //clear input (button)
    $scope.clearLLM = function() {
        $scope.llm.prompt = '';
        $scope.llm.error = '';
    };

    //Clear the conversation
    $scope.clearConversation = function() {
        $scope.messages = [];
        $scope.llm.prompt = '';
        $scope.llm.error = '';
        humanAIInteraction = [];            // reset conversation history so context is gone
        // if you want to indicate it in the UI as well:
        humanAIInteraction.push({ who: 'system', text: '[Conversation cleared]' });
    };

    //focus input convenience
    $scope.focusInput = function() {
        $timeout(function() {
            var ta = document.querySelector('.chat-input textarea');
            if (ta) ta.focus();
        }, 10);
    };

    //initial scroll
    $timeout(scrollToBottom, 200);

    //Part on the questions the user has to answer
    //each question has a prompt, 5 options and an array of correct option indices
    $scope.questions = [
        {
        prompt: "According to the text, which statement is true about platform features?",
        options: [
            "Likes are a completely harmless form of feature that usually do not influence how we feel about ourselves.",
            "While comment sections are a great way to engage with other people their content can sometimes be ambiguous.",
            "Hashtags are in essence a label that can help users find similar content.",
            "Filtered photos are generally perceived as less real than unfiltered photos.",
            "Instagram Stories were originally introduced by Instagram so that users could post non-permanent content that cannot be accessed later."
        ],
        //correct answers
        correctIndices: [1, 2]
        },
        {
        prompt: "According to the text, which statements are true about social media algorithms?",
        options: [
            "Social media algorithms are designed to maximize engagement.",
            "Social media algorithms are designed to support your mental wellbeing.",
            "A recommendation spiral describes how you are more likely to share content with someone if it has been recommended to you by a friend.",
            "The effects of a recommendation spiral can persist for a long time even after engaging with corresponding content",
            "Nowadays most social media algorithms take the “bubble” you are in into account and try to show you target content that depicts opposing views."
        ],
        //correct answers
        correctIndices: [0, 3]
        },
        {
        prompt: "According to the text, which statements are true about social media culture?",
        options: [
            "Usually people will follow either only people they know personally or only celebrities.",
            "The “highlight reel” effect describes that users are more likely to like posts that evoke emotions.",
            "The “highlight reel” effect can create a distorted sense of what is typical.",
            "Usually self-image and identity is made up out of multiple areas, such as hobbies or friendships.",
            "In the EU influencers are required to clearly label sponsored content."
        ],
        //correct answers
        correctIndices: [2, 3, 4]
        }
    ];

    //track which question is currently active (only this can be interacted with)
    $scope.currentQuestionIndex = 0;

    //define currently selected options flags
    $scope.selectedOptions = [];
    $scope.questions.forEach(function(q, i) {
        $scope.selectedOptions[i] = new Array(q.options.length).fill(false);
    });

    //track which questions have been answered correctly
    $scope.answeredCorrect = new Array($scope.questions.length).fill(false);

    //messages that will be displayed for incorrect attempts
    $scope.messagesQuestionsIncorrect = new Array($scope.questions.length).fill('');

    //helper function to check whether selected options are equal the correct set (set equality)
    $scope.isAnswerCorrect = function(qIndex) {
        var selected = [];
        $scope.selectedOptions[qIndex].forEach(function(val, idx) {
            if (val) selected.push(idx);
        });
        //sort both arrays for reliable comparison
        selected.sort(function(a,b){return a-b;});
        var correct = ($scope.questions[qIndex].correctIndices || []).slice().sort(function(a,b){return a-b;});
        //check if all questions are correct
        if (selected.length !== correct.length) return false;
            for (var i=0; i<selected.length; i++) {
                if (selected[i] !== correct[i]) return false;
            }
        return true;
    };

    //function thas called when user presses "Check answer" for current question
    $scope.checkAnswer = function(qIndex) {
        //prevent checking if not active question
        if (qIndex !== $scope.currentQuestionIndex) return;

        if ($scope.isAnswerCorrect(qIndex)) {
            $scope.answeredCorrect[qIndex] = true;
            $scope.messagesQuestionsIncorrect[qIndex] = '';
            // record start time for the next question
            const now = new Date().getTime()

            if (qIndex == 0){
                User.setStartTimeTask2_2(now);
                console.log("Beginning task 2_2")
            }
            if (qIndex == 1){
                User.setStartTimeTask2_3(now);
                console.log("Beginning task 2_3")
            }

            //unlock next question if any
            if ($scope.currentQuestionIndex < $scope.questions.length - 1) {
                $scope.currentQuestionIndex++;
            }
        } else {
            $scope.answeredCorrect[qIndex] = false;
            $scope.messagesQuestionsIncorrect[qIndex] = "Your selection is incorrect. Make sure you select all and only the correct choices. If you have access you can use the generative AI!";
            //update times failed
            if (qIndex == 0){
                User.setTimesFailedTask2_1(User.getTimesFailedTask2_1()+1)
                console.log("Failed attempt on task 2.1")
            }
            else if (qIndex == 1){
                User.setTimesFailedTask2_2(User.getTimesFailedTask2_2()+1)
                console.log("Failed attempt on task 2.2")
            } 
            else if (qIndex == 2){
                User.setTimesFailedTask2_3(User.getTimesFailedTask2_3()+1)
                console.log("Failed attempt on task 2.3")
            }
        }
    };

    //toggle option helper (only allowed for the active question and if not already marked correct)
    $scope.toggleOption = function(qIndex, optIndex) {
        if (qIndex !== $scope.currentQuestionIndex) return;
        if ($scope.answeredCorrect[qIndex]) return;
        $scope.selectedOptions[qIndex][optIndex] = !$scope.selectedOptions[qIndex][optIndex];
    };

    //function updated submitTask that only allows progression if all questions were answered correctly (in order)
    $scope.submitTask = function() {
        //check that all questions are answered correctly
        var allCorrect = $scope.answeredCorrect.every(function(x) { return x === true; });

        if (!allCorrect) {
            $scope.msg = "Please answer each question correctly before proceeding. Questions unlock sequentially.";
            //also show per-question feedback if available (messagesQuestionsIncorrect already contains them)
            return;
        }

        //If all answers are correct -> continue to next task
        User.setQueriesTask2(humanAIInteraction);

        console.log("Task 2 selected answers:", $scope.selectedOptions);
        console.log("LLM interactions for Task 2:", User.getQueriesTask2());
        console.log("Complete User response:", User.getResponse())

        User.setStartTimeTask3_1(new Date().getTime());

        //Continue to task 3
        $location.path("/task3");
    };
});
