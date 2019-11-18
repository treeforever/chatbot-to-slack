import * as React from "react";
import { useState, useCallback, useEffect } from "react";
const io = require('socket.io-client');
const socket = io('http://localhost:8080');

type Message = {
    text: string,
    sender: string
}

export default () => {
    const [inputValue, setInputValue] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([])
    const onChange = useCallback((e: any) => {
        setInputValue(e.target.value)
    }, [])

    useEffect(() => {
        socket.on('slack message', (data: Message) => {
            setMessages((messages) => [...messages, data])
        })
    }, [])

    const onSubmit = (e: any) => {
        e.preventDefault();
        setMessages((messages) => [...messages, { sender: 'me', text: inputValue }])
        socket.emit('browser message', inputValue)
        setInputValue('');
    }
    return (
        <>
            <ul id="messages">
                {messages.map((m, index) =>
                    <li key={index + m.text.slice(0, 3)}>{m.sender}: {m.text}</li>
                )}
            </ul>
            <form action="" onSubmit={onSubmit}>
                <input id="m" onChange={onChange} value={inputValue} /><button>Send</button>
            </form>
        </>
    )
}