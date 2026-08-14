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
      profiles: {
        Row: {
          avatar_id: string
          created_at: string
          current_book_id: string | null
          daily_goal: number
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_id?: string
          created_at?: string
          current_book_id?: string | null
          daily_goal?: number
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_id?: string
          created_at?: string
          current_book_id?: string | null
          daily_goal?: number
          display_name?: string
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
      [_ in never]: never
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

