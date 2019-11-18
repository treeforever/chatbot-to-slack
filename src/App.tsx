import * as React from "react";
import { useState, useCallback, useEffect } from "react";
const io = require('socket.io-client');
const socket = io('http://localhost:8080');

type Message = {
    text: string,
    name: string
}

const listStyle = (isLeft: boolean) => ({
    padding: '5px 10px',
    marginTop: '.5em',
    display: 'flex',
    justifyContent: isLeft ? 'flex-start' : 'flex-end'
})


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
        setMessages((messages) => [...messages, { name: 'me', text: inputValue }])
        socket.emit('browser message', inputValue)
        setInputValue('');
    }
    return (
        <>
            <ul id="messages">
                {messages.map((m, index) =>
                    <li
                        key={index + m.text.slice(0, 3)}
                        style={listStyle(m.name === 'me')}
                    >
                        <span className={m.name === 'me' ? 'my-message' : 'other-message'}>{m.name !== 'me' ? `${m.name}: ` : ''}{m.text}</span>
                    </li>
                )}
            </ul>
            <form action="" onSubmit={onSubmit}>
                <input id="m" onChange={onChange} value={inputValue} /><button>Send</button>
            </form>
        </>
    )
}