import React from 'react';
import HomePage from '@/pages/HomePage';
import { IWidget } from '@/types/widget';

const App: React.FC<{ widget: IWidget }> = ({ widget }) => {
  return (
    <HomePage />
  );
};

export default App; 