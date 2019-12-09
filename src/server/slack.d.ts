declare namespace slack {
    interface SlackResponse {
        ok: boolean;
        channel: string;
        ts: string;
        message: Message;
    }

    interface Message {
        text: string;
        username: string;
        bot_id: string;
        attachments: Attachment[];
        type: string;
        subtype: string;
        ts: string;
    }

    interface Attachment {
        text: string;
        id: number;
        fallback: string;
    }


    type UserInfo = {
        ok: true;
        user: User;
    } | {
        ok: false;
        error: string;
    }

    interface User {
        id: string;
        team_id: string;
        name: string;
        deleted: boolean;
        color: string;
        real_name: string;
        tz: string;
        tz_label: string;
        tz_offset: number;
        profile: { [key: string]: string };
        is_admin: boolean;
        is_owner: boolean;
        is_primary_owner: boolean;
        is_restricted: boolean;
        is_ultra_restricted: boolean;
        is_bot: boolean;
        updated: number;
        is_app_user: boolean;
        has_2fa: boolean;
    }
    type Messages = [(slack.Message & { reply_users: {} }), ...(slack.Message[])];

    type ConversationReplies = {
        messages: Messages;
        has_more: boolean;
        ok: true;
        response_metadata: ResponseMetadata;
    } | { ok: false, error: string }

    interface Message {
        type: string;
        user: string;
        text: string;
        thread_ts: string;
        reply_count?: number;
        replies?: Reply[];
        subscribed?: boolean;
        last_read?: string;
        unread_count?: number;
        ts: string;
        parent_user_id?: string;
    }


    interface Reply {
        user: string;
        ts: string;
    }

    interface ResponseMetadata {
        next_cursor: string;
    }
}
