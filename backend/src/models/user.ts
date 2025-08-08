export interface User {
  id: number;
  email: string;
  username?: string;
  password?: string;
  google_id?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  username?: string;
  password?: string;
  googleId?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface GoogleUserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
} 