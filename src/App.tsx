import * as React from "react";
import { useState, useCallback, useEffect } from "react";
const io = require('socket.io-client');
const socket = io('http://localhost:8080');

type SlackMessage = {
    reply: string,
    sender: string
}

export default () => {
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([])
    const onChange = useCallback((e: any) => {
        setInputValue(e.target.value)
    }, [])
    const addMessage = useCallback((msg: string) => {
        console.log('when is this updated', messages)
        setMessages([...messages, msg])
    }, [messages])
    useEffect(() => {
        socket.on('slack message', (data: SlackMessage) => {
            console.log('slack msg', data)
            setMessages((messages) => [...messages, data.reply])
            // addMessage(data.reply)
        })
    }, [])
    console.log('outer', messages)

    const onSubmit = (e: any) => {
        e.preventDefault();
        setInputValue('');
        setMessages((messages) => [...messages, inputValue])
        socket.emit('browser message', inputValue)
    }
    return (
        <>
            <ul id="messages">
                {messages.map((m, index) =>
                    <li key={index + m.slice(0, 3)}>{m}</li>
                )}
            </ul>
            <form action="" onSubmit={onSubmit}>
                <input id="m" onChange={onChange} value={inputValue} /><button>Send</button>
            </form>
        </>
    )
}