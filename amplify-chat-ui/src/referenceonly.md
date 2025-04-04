



var my_awesome_script = document.createElement('script');

my_awesome_script.setAttribute('src',"http://localhost:5173/serve.js?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInVzZXJuYW1lIjoidmlrYXMiLCJlbWFpbCI6InRpd2FyaS52aWthc0BnbWFpbC5jb20iLCJpYXQiOjE3MDc4MDc5NjcsImV4cCI6MTcwNzgwNzk5N30.RQ3TgwH9qD7d7nfJjKeb_Q5Y5bt6zmntLgp0ceirjKk&amp;whitelabel=False&amp;windowHeading=Chat+with+us%21&amp;popupMessage=Check+out+%3Cb%3EAI+chatbot%21%3C%2Fb%3E&amp;welcomeMessage=%F0%9F%91%8B+Hi%21+I+am+QChat+AI+Assistant.+Ask+me+anything+about+current+website...&amp;addUnreadDot=True&amp;bottomIndent=24&amp;rightIndent=24&amp;zIndex=99999&amp;buttonSize=64");

document.head.appendChild(my_awesome_script);




GET
https://api.qchat.ai/v2/collections/answer?chat=%5B%7B%22role%22%3A%22assistant%22%2C%22content%22%3A%22%F0%9F%91%8B%20Hi%21%20I%20am%20QChat%20AI%20Assistant.%20Ask%20me%20anything%20about%20current%20website...%22%7D%2C%7B%22role%22%3A%22user%22%2C%22content%22%3A%22Hello%22%7D%5D&stream=true

chat: %5B%7B%22role%22%3A%22assistant%22%2C%22content%22%3A%22%F0%9F%91%8B%20Hi%21%20I%20am%20QChat%20AI%20Assistant.%20Ask%20me%20anything%20about%20current%20website...%22%7D%2C%7B%22role%22%3A%22user%22%2C%22content%22%3A%22Hello%22%7D%5D
stream: true

chat: [{"role":"assistant","content":"👋 Hi! I am QChat AI Assistant. Ask me anything about current website..."},{"role":"user","content":"Hello"}]
stream: true

chat: [{"role":"assistant","content":"👋 Hi! I am QChat AI Assistant. Ask me anything about current website..."},{"role":"user","content":"Hello"},{"role":"assistant","content":"Hello! How can I assist you today? If you have any questions or need information based on the given texts, feel free to ask.","requestId":"65ccf94cfda389a08024fd57"},{"role":"user","content":"test"}]
stream: true

Content-Type:
text/event-stream; charset=utf-8
Transfer-Encoding:
chunked


POST: 
https://api.qchat.ai/v2/events
{"type":"POPUP_CALLED"}

POST: https://api.qchat.ai/v2/reactions
{"request_id":"65ccf94cfda389a08024fd57","like_status":"good_answer"}

