var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var axios = require('axios');
require('dotenv').config()

io.on('connection', function (socket: any) {
    console.log('a user connected');
    socket.on('chat message', function (msg: string) {
        console.log('chatm', msg)
        postSlackMessage(msg, '#random')
        io.emit('chat message', msg);
    });
});

http.listen(8080, function () {
    console.log('listening on *:8080');
});

type TimeStamp = string;
const postSlackMessage = async (
    text: string,
    channel: string,
): Promise<TimeStamp> => {
    console.log('credentials', process.env.BOT_TOKEN )
    const options: any = {
        url: 'https://slack.com/api/chat.postMessage',
        method: 'POST',
        headers: {
            'Content-type': 'application/json;charset=utf-8',
            Authorization: `Bearer ${process.env.BOT_TOKEN}`,
        },
        data: {
            channel,
            text,
        },
    };
    try {
        const response = await axios(options);
        console.log('Post message:', response.data);
        return response.data.ts;
    } catch (err) {
        console.log('Message post failed:', err);
    }
};
