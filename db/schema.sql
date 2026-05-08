-- smart-task-reminder schema
-- Safe to run multiple times (idempotent)

CREATE TABLE IF NOT EXISTS tasks (
  id              BIGINT UNSIGNED    NOT NULL AUTO_INCREMENT,
  title           VARCHAR(255)       NOT NULL,
  description     TEXT               NULL,
  due_date        DATE               NOT NULL,
  priority        TINYINT UNSIGNED   NOT NULL DEFAULT 5 COMMENT '1 (low) – 10 (critical)',
  is_done         TINYINT(1)         NOT NULL DEFAULT 0,
  user_email      VARCHAR(255)       NOT NULL,

  -- Reminder tracking
  -- 'pending'  = no reminder sent yet
  -- 'early'    = 2-day-before reminder sent
  -- 'due'      = due-date reminder sent
  -- 'overdue'  = at least one overdue chase sent
  reminder_status ENUM('pending','early','due','overdue') NOT NULL DEFAULT 'pending',
  last_reminded_at DATETIME          NULL,

  created_at      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_due_date      (due_date),
  INDEX idx_user_email    (user_email),
  INDEX idx_is_done       (is_done),
  INDEX idx_reminder      (is_done, due_date, reminder_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;