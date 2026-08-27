export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      badge_awards: {
        Row: {
          acknowledged_at: string | null
          award_kind: string
          awarded_at: string
          badge_key: string
          id: string
          placement: number | null
          user_id: string
          week_end: string | null
          week_start: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          award_kind: string
          awarded_at?: string
          badge_key: string
          id?: string
          placement?: number | null
          user_id: string
          week_end?: string | null
          week_start?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          award_kind?: string
          awarded_at?: string
          badge_key?: string
          id?: string
          placement?: number | null
          user_id?: string
          week_end?: string | null
          week_start?: string | null
        }
        Relationships: []
      }
      books: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_locked: boolean
          name: string
          slug: string
          word_count: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order: number
          id?: string
          is_locked?: boolean
          name: string
          slug: string
          word_count?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_locked?: boolean
          name?: string
          slug?: string
          word_count?: number
        }
        Relationships: []
      }
      chapters: {
        Row: {
          book_id: string
          chapter_number: number
          created_at: string
          display_order: number
          id: string
          title: string
        }
        Insert: {
          book_id: string
          chapter_number: number
          created_at?: string
          display_order: number
          id?: string
          title: string
        }
        Update: {
          book_id?: string
          chapter_number?: number
          created_at?: string
          display_order?: number
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      combat_match_answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          match_id: string
          question_id: string
          response_time_ms: number
          selected_answer: string | null
          submitted_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          match_id: string
          question_id: string
          response_time_ms?: number
          selected_answer?: string | null
          submitted_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          match_id?: string
          question_id?: string
          response_time_ms?: number
          selected_answer?: string | null
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combat_match_answers_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "combat_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combat_match_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      combat_match_messages: {
        Row: {
          created_at: string
          id: string
          match_id: string
          message: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          message: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combat_match_messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "combat_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      combat_match_invites: {
        Row: {
          created_at: string
          id: string
          match_id: string
          recipient_id: string
          responded_at: string | null
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          recipient_id: string
          responded_at?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          recipient_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "combat_match_invites_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "combat_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      combat_match_players: {
        Row: {
          answered_count: number
          correct_count: number
          id: string
          is_ready: boolean
          joined_at: string
          last_seen_at: string
          match_id: string
          slot: number
          total_time_ms: number
          user_id: string
        }
        Insert: {
          answered_count?: number
          correct_count?: number
          id?: string
          is_ready?: boolean
          joined_at?: string
          last_seen_at?: string
          match_id: string
          slot: number
          total_time_ms?: number
          user_id: string
        }
        Update: {
          answered_count?: number
          correct_count?: number
          id?: string
          is_ready?: boolean
          joined_at?: string
          last_seen_at?: string
          match_id?: string
          slot?: number
          total_time_ms?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combat_match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "combat_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      combat_match_questions: {
        Row: {
          correct_answer: string
          created_at: string
          explanation: string | null
          id: string
          match_id: string
          options: Json
          position: number
          question: string
          question_id: string
          word_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          explanation?: string | null
          id?: string
          match_id: string
          options: Json
          position: number
          question: string
          question_id: string
          word_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          explanation?: string | null
          id?: string
          match_id?: string
          options?: Json
          position?: number
          question?: string
          question_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combat_match_questions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "combat_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combat_match_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combat_match_questions_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      combat_match_reports: {
        Row: {
          created_at: string
          id: string
          match_id: string
          note: string | null
          reason: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          note?: string | null
          reason: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          note?: string | null
          reason?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combat_match_reports_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "combat_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      combat_matches: {
        Row: {
          cancelled_at: string | null
          created_at: string
          current_question_index: number
          current_question_started_at: string | null
          expires_at: string
          finished_at: string | null
          host_id: string
          id: string
          join_code: string
          opponent_id: string | null
          preset: string
          question_count: number
          question_source: Json
          round_grace_deadline: string | null
          started_at: string | null
          status: string
          time_limit_seconds: number
          updated_at: string
          visibility: string
          wager_settled_at: string | null
          wager_status: string
          wager_winner_id: string | null
          wager_xp: number
          winner_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          current_question_index?: number
          current_question_started_at?: string | null
          expires_at?: string
          finished_at?: string | null
          host_id: string
          id?: string
          join_code: string
          opponent_id?: string | null
          preset?: string
          question_count?: number
          question_source?: Json
          round_grace_deadline?: string | null
          started_at?: string | null
          status?: string
          time_limit_seconds?: number
          updated_at?: string
          visibility?: string
          wager_settled_at?: string | null
          wager_status?: string
          wager_winner_id?: string | null
          wager_xp?: number
          winner_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          current_question_index?: number
          current_question_started_at?: string | null
          expires_at?: string
          finished_at?: string | null
          host_id?: string
          id?: string
          join_code?: string
          opponent_id?: string | null
          preset?: string
          question_count?: number
          question_source?: Json
          round_grace_deadline?: string | null
          started_at?: string | null
          status?: string
          time_limit_seconds?: number
          updated_at?: string
          visibility?: string
          wager_settled_at?: string | null
          wager_status?: string
          wager_winner_id?: string | null
          wager_xp?: number
          winner_id?: string | null
        }
        Relationships: []
      }
      combat_wager_ledger: {
        Row: {
          amount: number
          created_at: string
          entry_type: string
          id: string
          match_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          entry_type: string
          id?: string
          match_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          entry_type?: string
          id?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combat_wager_ledger_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "combat_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_progress: {
        Row: {
          challenge_completed: boolean
          completed: boolean
          created_at: string
          date: string
          goal: number
          id: string
          new_words_completed: number
          reviews_completed: number
          user_id: string
          xp_earned: number
        }
        Insert: {
          challenge_completed?: boolean
          completed?: boolean
          created_at?: string
          date: string
          goal: number
          id?: string
          new_words_completed?: number
          reviews_completed?: number
          user_id: string
          xp_earned?: number
        }
        Update: {
          challenge_completed?: boolean
          completed?: boolean
          created_at?: string
          date?: string
          goal?: number
          id?: string
          new_words_completed?: number
          reviews_completed?: number
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      feedback_submissions: {
        Row: {
          attachment_content_type: string | null
          attachment_filename: string | null
          attachment_size: number | null
          category: string
          created_at: string
          display_name: string
          email_error: string | null
          email_sent: boolean
          email_sent_at: string | null
          id: string
          message: string
          page_path: string | null
          page_paths: string[] | null
          status: string
          user_email: string
          user_id: string
        }
        Insert: {
          attachment_content_type?: string | null
          attachment_filename?: string | null
          attachment_size?: number | null
          category: string
          created_at?: string
          display_name: string
          email_error?: string | null
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          message: string
          page_path?: string | null
          page_paths?: string[] | null
          status?: string
          user_email: string
          user_id: string
        }
        Update: {
          attachment_content_type?: string | null
          attachment_filename?: string | null
          attachment_size?: number | null
          category?: string
          created_at?: string
          display_name?: string
          email_error?: string | null
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          message?: string
          page_path?: string | null
          page_paths?: string[] | null
          status?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      levels: {
        Row: {
          chapter_id: string
          created_at: string
          display_order: number
          id: string
          level_number: number
          title: string
          word_count: number
        }
        Insert: {
          chapter_id: string
          created_at?: string
          display_order: number
          id?: string
          level_number: number
          title: string
          word_count?: number
        }
        Update: {
          chapter_id?: string
          created_at?: string
          display_order?: number
          id?: string
          level_number?: number
          title?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "levels_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_test_answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          test_id: string
          user_answer: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          test_id: string
          user_answer?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          test_id?: string
          user_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_test_answers_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_tests: {
        Row: {
          correct_answers: number
          created_at: string
          id: string
          score: number
          time_taken_seconds: number | null
          total_questions: number
          user_id: string
        }
        Insert: {
          correct_answers?: number
          created_at?: string
          id?: string
          score?: number
          time_taken_seconds?: number | null
          total_questions: number
          user_id: string
        }
        Update: {
          correct_answers?: number
          created_at?: string
          id?: string
          score?: number
          time_taken_seconds?: number | null
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_id: string
          avatar_url: string | null
          created_at: string
          current_book_id: string | null
          daily_goal: number
          display_name: string
          id: string
          study_gc_joined: boolean
          theme_preference: string
          updated_at: string
        }
        Insert: {
          avatar_id?: string
          avatar_url?: string | null
          created_at?: string
          current_book_id?: string | null
          daily_goal?: number
          display_name: string
          id: string
          study_gc_joined?: boolean
          theme_preference?: string
          updated_at?: string
        }
        Update: {
          avatar_id?: string
          avatar_url?: string | null
          created_at?: string
          current_book_id?: string | null
          daily_goal?: number
          display_name?: string
          id?: string
          study_gc_joined?: boolean
          theme_preference?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_book_id_fkey"
            columns: ["current_book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      question_reports: {
        Row: {
          category: string
          correct_answer: string
          created_at: string
          id: string
          mode: string
          note: string | null
          options: Json | null
          question_id: string | null
          question_text: string
          question_type: string
          status: string
          updated_at: string
          user_id: string
          word_id: string | null
        }
        Insert: {
          category: string
          correct_answer: string
          created_at?: string
          id?: string
          mode?: string
          note?: string | null
          options?: Json | null
          question_id?: string | null
          question_text: string
          question_type: string
          status?: string
          updated_at?: string
          user_id: string
          word_id?: string | null
        }
        Update: {
          category?: string
          correct_answer?: string
          created_at?: string
          id?: string
          mode?: string
          note?: string | null
          options?: Json | null
          question_id?: string | null
          question_text?: string
          question_type?: string
          status?: string
          updated_at?: string
          user_id?: string
          word_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reports_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          options: Json | null
          question: string
          question_type: string
          word_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          question: string
          question_type: string
          word_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          question?: string
          question_type?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_words: {
        Row: {
          created_at: string
          id: string
          user_id: string
          word_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          word_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_words_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          last_seen_at: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_privacy: {
        Row: {
          discoverable: boolean
          friend_challenges_enabled: boolean
          presence_visible: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          discoverable?: boolean
          friend_challenges_enabled?: boolean
          presence_visible?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          discoverable?: boolean
          friend_challenges_enabled?: boolean
          presence_visible?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          current_streak: number
          last_activity_at: string | null
          longest_streak: number
          total_xp: number
          user_id: string
          words_learned: number
          words_mastered: number
        }
        Insert: {
          current_streak?: number
          last_activity_at?: string | null
          longest_streak?: number
          total_xp?: number
          user_id: string
          words_learned?: number
          words_mastered?: number
        }
        Update: {
          current_streak?: number
          last_activity_at?: string | null
          longest_streak?: number
          total_xp?: number
          user_id?: string
          words_learned?: number
          words_mastered?: number
        }
        Relationships: []
      }
      user_word_progress: {
        Row: {
          correct_count: number
          created_at: string
          id: string
          last_reviewed_at: string | null
          next_review_at: string | null
          recall_streak: number
          status: string
          updated_at: string
          user_id: string
          word_id: string
          wrong_count: number
        }
        Insert: {
          correct_count?: number
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          next_review_at?: string | null
          recall_streak?: number
          status?: string
          updated_at?: string
          user_id: string
          word_id: string
          wrong_count?: number
        }
        Update: {
          correct_count?: number
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          next_review_at?: string | null
          recall_streak?: number
          status?: string
          updated_at?: string
          user_id?: string
          word_id?: string
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_word_progress_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_leaderboard_entries: {
        Row: {
          created_at: string
          finalized_at: string | null
          finalized_rank: number | null
          first_earned_at: string
          id: string
          updated_at: string
          user_id: string
          week_end: string
          week_start: string
          xp: number
        }
        Insert: {
          created_at?: string
          finalized_at?: string | null
          finalized_rank?: number | null
          first_earned_at?: string
          id?: string
          updated_at?: string
          user_id: string
          week_end: string
          week_start: string
          xp?: number
        }
        Update: {
          created_at?: string
          finalized_at?: string | null
          finalized_rank?: number | null
          first_earned_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          week_end?: string
          week_start?: string
          xp?: number
        }
        Relationships: []
      }
      words: {
        Row: {
          antonyms: string[] | null
          bangla_meaning: string | null
          book_word_number: number
          created_at: string
          difficulty: string | null
          english_meaning: string
          example_sentence: string | null
          id: string
          level_id: string
          mnemonic: string | null
          part_of_speech: string
          pronunciation: string | null
          synonyms: string[] | null
          word: string
        }
        Insert: {
          antonyms?: string[] | null
          bangla_meaning?: string | null
          book_word_number: number
          created_at?: string
          difficulty?: string | null
          english_meaning: string
          example_sentence?: string | null
          id?: string
          level_id: string
          mnemonic?: string | null
          part_of_speech: string
          pronunciation?: string | null
          synonyms?: string[] | null
          word: string
        }
        Update: {
          antonyms?: string[] | null
          bangla_meaning?: string | null
          book_word_number?: number
          created_at?: string
          difficulty?: string | null
          english_meaning?: string
          example_sentence?: string | null
          id?: string
          level_id?: string
          mnemonic?: string | null
          part_of_speech?: string
          pronunciation?: string | null
          synonyms?: string[] | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "words_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acknowledge_my_badge_awards: {
        Args: { p_award_ids: string[] }
        Returns: number
      }
      finalize_mock_test_canonical: {
        Args: {
          p_test_id: string
          p_time_taken_seconds: number
          p_user_id: string
        }
        Returns: {
          correct_answers: number
          created_at: string
          finalized: boolean
          id: string
          score: number
          time_taken_seconds: number
          total_questions: number
          user_id: string
        }[]
      }
      finalize_weekly_leaderboard: {
        Args: { p_week_start: string }
        Returns: number
      }
      get_display_badges_for_users: {
        Args: { p_user_ids: string[] }
        Returns: {
          acknowledged_at: string
          award_kind: string
          awarded_at: string
          badge_key: string
          id: string
          placement: number
          user_id: string
          week_end: string
          week_start: string
        }[]
      }
      get_leaderboard: {
        Args: { p_limit?: number; p_mode: string }
        Returns: {
          avatar_id: string
          avatar_url: string
          current_streak: number
          display_name: string
          longest_streak: number
          rank: number
          total_xp: number
          user_id: string
          week_end: string
          week_start: string
          weekly_xp: number
          words_learned: number
          words_mastered: number
        }[]
      }
      get_my_pending_badge_awards: {
        Args: never
        Returns: {
          acknowledged_at: string
          award_kind: string
          awarded_at: string
          badge_key: string
          id: string
          placement: number
          user_id: string
          week_end: string
          week_start: string
        }[]
      }
      get_public_book_progress: {
        Args: { p_user_id: string }
        Returns: {
          book_id: string
          learned: number
          mastered: number
          total: number
        }[]
      }
      get_public_leaderboard_summary: {
        Args: { p_user_id: string }
        Returns: {
          all_time_rank: number
          best_weekly_xp: number
          current_week_rank: number
          highest_weekly_rank: number
          weekly_second_places: number
          weekly_third_places: number
          weekly_wins: number
          weeks_ranked: number
        }[]
      }
      get_public_mock_test_summary: {
        Args: { p_user_id: string }
        Returns: {
          average_percentage: number
          average_score: number
          best_percentage: number
          highest_score: number
          tests_taken: number
        }[]
      }
      is_accepted_friend: {
        Args: { p_other_user_id: string; p_user_id: string }
        Returns: boolean
      }
      leave_combat_match: {
        Args: { p_match_id: string; p_user_id: string }
        Returns: {
          cancelled_at: string | null
          created_at: string
          current_question_index: number
          current_question_started_at: string | null
          expires_at: string
          finished_at: string | null
          host_id: string
          id: string
          join_code: string
          opponent_id: string | null
          preset: string
          question_count: number
          question_source: Json
          round_grace_deadline: string | null
          started_at: string | null
          status: string
          time_limit_seconds: number
          updated_at: string
          visibility: string
          wager_settled_at: string | null
          wager_status: string
          wager_winner_id: string | null
          wager_xp: number
          winner_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "combat_matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      heartbeat_combat_match: {
        Args: { p_match_id: string; p_user_id: string }
        Returns: {
          cancelled_at: string | null
          created_at: string
          current_question_index: number
          current_question_started_at: string | null
          expires_at: string
          finished_at: string | null
          host_id: string
          id: string
          join_code: string
          opponent_id: string | null
          preset: string
          question_count: number
          question_source: Json
          round_grace_deadline: string | null
          started_at: string | null
          status: string
          time_limit_seconds: number
          updated_at: string
          visibility: string
          wager_settled_at: string | null
          wager_status: string
          wager_winner_id: string | null
          wager_xp: number
          winner_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "combat_matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      join_combat_match: {
        Args: { p_match_id: string; p_user_id: string }
        Returns: {
          cancelled_at: string | null
          created_at: string
          current_question_index: number
          current_question_started_at: string | null
          expires_at: string
          finished_at: string | null
          host_id: string
          id: string
          join_code: string
          opponent_id: string | null
          preset: string
          question_count: number
          question_source: Json
          round_grace_deadline: string | null
          started_at: string | null
          status: string
          time_limit_seconds: number
          updated_at: string
          visibility: string
          wager_settled_at: string | null
          wager_status: string
          wager_winner_id: string | null
          wager_xp: number
          winner_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "combat_matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_xp: { Args: { p_amount: number }; Returns: undefined }
      send_combat_message: {
        Args: { p_match_id: string; p_message: string; p_sender_id: string }
        Returns: {
          created_at: string
          id: string
          match_id: string
          message: string
          sender_id: string
        }
      }
      submit_combat_answer: {
        Args: { p_match_id: string; p_question_id: string; p_response_time_ms?: number; p_selected_answer: string | null; p_user_id: string }
        Returns: Json
      }
      record_xp_for_user: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      reserve_combat_wager: {
        Args: { p_match_id: string; p_user_id: string }
        Returns: {
          cancelled_at: string | null
          created_at: string
          current_question_index: number
          current_question_started_at: string | null
          expires_at: string
          finished_at: string | null
          host_id: string
          id: string
          join_code: string
          opponent_id: string | null
          preset: string
          question_count: number
          question_source: Json
          round_grace_deadline: string | null
          started_at: string | null
          status: string
          time_limit_seconds: number
          updated_at: string
          visibility: string
          wager_settled_at: string | null
          wager_status: string
          wager_winner_id: string | null
          wager_xp: number
          winner_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "combat_matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_library_words: {
        Args: {
          p_book_id?: string
          p_letter?: string
          p_level_id?: string
          p_limit?: number
          p_offset?: number
          p_query?: string
        }
        Returns: {
          antonyms: string[]
          bangla_meaning: string
          book_word_number: number
          created_at: string
          difficulty: string
          english_meaning: string
          example_sentence: string
          id: string
          level_id: string
          mnemonic: string
          part_of_speech: string
          pronunciation: string
          synonyms: string[]
          total_count: number
          word: string
        }[]
      }
      settle_combat_wager: {
        Args: { p_match_id: string; p_winner_id?: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

