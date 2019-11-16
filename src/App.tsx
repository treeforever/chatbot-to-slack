import * as React from "react";
import { useState, useCallback } from "react";
const io = require('socket.io-client');
const socket = io('http://localhost:8080');

export default () => {
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([])
    const onChange = useCallback((e: any) => {
        setInputValue(e.target.value)
    }, [])

    const onSubmit = (e: any) => {
        e.preventDefault();
        setInputValue('');
        setMessages([...messages, inputValue])
        socket.emit('chat message', inputValue)
        socket.on('slack message', () => {

        })
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