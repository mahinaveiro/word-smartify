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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
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
      badge_awards: {
        Row: {
          acknowledged_at: string | null
          awarded_at: string
          award_kind: string
          badge_key: string
          id: string
          placement: number | null
          user_id: string
          week_end: string | null
          week_start: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          awarded_at?: string
          award_kind: string
          badge_key: string
          id?: string
          placement?: number | null
          user_id: string
          week_end?: string | null
          week_start?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          awarded_at?: string
          award_kind?: string
          badge_key?: string
          id?: string
          placement?: number | null
          user_id?: string
          week_end?: string | null
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "badge_awards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      profiles: {
        Row: {
          avatar_id: string
          avatar_url: string | null
          created_at: string
          current_book_id: string | null
          daily_goal: number
          display_name: string
          study_gc_joined: boolean
          theme_preference: 'light' | 'dark'
          id: string
          updated_at: string
        }
        Insert: {
          avatar_id?: string
          avatar_url?: string | null
          created_at?: string
          current_book_id?: string | null
          daily_goal?: number
          display_name: string
          study_gc_joined?: boolean
          theme_preference?: 'light' | 'dark'
          id: string
          updated_at?: string
        }
        Update: {
          avatar_id?: string
          avatar_url?: string | null
          created_at?: string
          current_book_id?: string | null
          daily_goal?: number
          display_name?: string
          study_gc_joined?: boolean
          theme_preference?: 'light' | 'dark'
          id?: string
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
          part_of_speech?: string
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
      finalize_weekly_leaderboard: {
        Args: { p_week_start: string }
        Returns: number
      }
      finalize_mock_test_canonical: {
        Args: { p_test_id: string; p_user_id: string; p_time_taken_seconds: number }
        Returns: Array<{
          finalized: boolean
          id: string
          user_id: string
          total_questions: number
          correct_answers: number
          score: number
          time_taken_seconds: number | null
          created_at: string
        }>
      }
      get_display_badges_for_users: {
        Args: { p_user_ids: string[] }
        Returns: Array<{
          id: string
          user_id: string
          badge_key: string
          award_kind: string
          week_start: string | null
          week_end: string | null
          placement: number | null
          awarded_at: string
          acknowledged_at: string | null
        }>
      }
      get_leaderboard: {
        Args: { p_limit?: number; p_mode: string }
        Returns: Array<{
          rank: number
          user_id: string
          display_name: string
          avatar_id: string
          avatar_url: string | null
          total_xp: number
          weekly_xp: number | null
          current_streak: number
          longest_streak: number
          words_learned: number
          words_mastered: number
          week_start: string
          week_end: string
        }>
      }
      get_my_pending_badge_awards: {
        Args: Record<PropertyKey, never>
        Returns: Array<{
          id: string
          user_id: string
          badge_key: string
          award_kind: string
          week_start: string | null
          week_end: string | null
          placement: number | null
          awarded_at: string
          acknowledged_at: string | null
        }>
      }
      get_public_book_progress: {
        Args: { p_user_id: string }
        Returns: Array<{
          book_id: string
          total: number
          learned: number
          mastered: number
        }>
      }
      get_public_leaderboard_summary: {
        Args: { p_user_id: string }
        Returns: Array<{
          current_week_rank: number | null
          highest_weekly_rank: number | null
          weekly_wins: number
          weekly_second_places: number
          weekly_third_places: number
          weeks_ranked: number
          best_weekly_xp: number
          all_time_rank: number | null
        }>
      }
      get_public_mock_test_summary: {
        Args: { p_user_id: string }
        Returns: Array<{
          tests_taken: number
          average_score: number | null
          highest_score: number | null
          average_percentage: number | null
          best_percentage: number | null
        }>
      }
      record_xp: {
        Args: { p_amount: number }
        Returns: null
      }
      record_xp_for_user: {
        Args: { p_amount: number; p_user_id: string }
        Returns: null
      }
      search_library_words: {
        Args: {
          p_book_id?: string | null
          p_level_id?: string | null
          p_letter?: string | null
          p_limit?: number
          p_offset?: number
          p_query?: string
        }
        Returns: Array<{
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
          total_count: number
          word: string
        }>
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

