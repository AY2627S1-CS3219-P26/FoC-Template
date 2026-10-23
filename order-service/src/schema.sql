CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    requester_id TEXT NOT NULL,
    courier_id TEXT,
    supplier_id TEXT NOT NULL,
    delivery_location TEXT NOT NULL,
    needed_by_time TIMESTAMPTZ NOT NULL,
    item_lines TEXT[] NOT NULL,
    credit_reward INTEGER NOT NULL CHECK (credit_reward BETWEEN 1 AND 50),
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Open', 'Accepted', 'PickedUp', 'Delivered', 'Completed', 'Cancelled', 'Expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_outbox (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    data JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS order_outbox_pending ON order_outbox (occurred_at) WHERE sent_at IS NULL;
