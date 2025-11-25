# Conversation History API

## Endpoints

### 1. Create Conversation

**POST** `/api/v1/conversations`

**Request Body:**

```json
{
  "userId": "clerk_user_id",
  "docSource": "nextjs|react|typescript",
  "title": "Optional conversation title"
}
```

**Response:**

```json
{
  "conversationId": "uuid"
}
```

---

### 2. Get User Conversations

**GET** `/api/v1/conversations?userId={clerkId}&limit={20}`

**Query Parameters:**

- `userId` (required): Clerk user ID
- `limit` (optional): Number of conversations to return (default: 20)

**Response:**

```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "Conversation Title",
      "doc_source": "nextjs",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```

---

### 3. Get Conversation Messages

**GET** `/api/v1/conversations/:id/messages`

**Response:**

```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "user|assistant",
      "content": "message content",
      "references": [...],
      "created_at": "timestamp"
    }
  ]
}
```

---

### 4. Update Conversation Title

**PATCH** `/api/v1/conversations/:id`

**Request Body:**

```json
{
  "title": "New Title"
}
```

**Response:**

```json
{
  "success": true
}
```

---

### 5. Save Message to Conversation

**POST** `/api/v1/conversations/:id/messages`

**Request Body:**

```json
{
  "role": "user|assistant",
  "content": "message content",
  "references": [
    {
      "title": "Doc Title",
      "url": "https://...",
      "snippet": "..."
    }
  ],
  "tokensUsed": 100
}
```

**Response:**

```json
{
  "success": true
}
```

## Database Tables

### conversations

- `id`: UUID (PK)
- `user_id`: UUID (FK -> users.id)
- `title`: TEXT
- `doc_source`: TEXT
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### messages

- `id`: UUID (PK)
- `conversation_id`: UUID (FK -> conversations.id)
- `role`: TEXT ('user' | 'assistant')
- `content`: TEXT
- `references`: JSONB
- `tokens_used`: INTEGER
- `created_at`: TIMESTAMP
