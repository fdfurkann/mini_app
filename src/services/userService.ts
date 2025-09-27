import { executeQuery } from '../config/database';

interface User {
  id: number;
  telegram_id: string;
  username: string;
  created_at: Date;
  updated_at: Date;
}

export const getUserByTelegramId = async (telegramId: string): Promise<User | null> => {
  try {
    const query = 'SELECT * FROM users WHERE telegram_id = ?';
    const results = await executeQuery(query, [telegramId]) as User[];
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

export const createUser = async (telegramId: string, username: string): Promise<User> => {
  try {
    const query = `
      INSERT INTO users (telegram_id, username, created_at, updated_at) 
      VALUES (?, ?, NOW(), NOW())
    `;
    await executeQuery(query, [telegramId, username]);
    return getUserByTelegramId(telegramId) as Promise<User>;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const updateUser = async (id: number, data: Partial<User>): Promise<void> => {
  try {
    const updates = Object.entries(data)
      .filter(([key]) => key !== 'id' && key !== 'created_at')
      .map(([key]) => `${key} = ?`)
      .join(', ');
    
    const values = Object.entries(data)
      .filter(([key]) => key !== 'id' && key !== 'created_at')
      .map(([_, value]) => value);

    const query = `
      UPDATE users 
      SET ${updates}, updated_at = NOW()
      WHERE id = ?
    `;
    
    await executeQuery(query, [...values, id]);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}; 