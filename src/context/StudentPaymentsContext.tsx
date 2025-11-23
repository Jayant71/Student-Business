import React, { createContext, useContext } from 'react';
import { StudentPaymentsState } from '../hooks/useStudentPayments';

const StudentPaymentsContext = createContext<StudentPaymentsState | null>(null);

interface StudentPaymentsProviderProps {
    value: StudentPaymentsState;
    children: React.ReactNode;
}

export const StudentPaymentsProvider: React.FC<StudentPaymentsProviderProps> = ({ value, children }) => (
    <StudentPaymentsContext.Provider value={value}>
        {children}
    </StudentPaymentsContext.Provider>
);

export const useStudentPaymentsContext = (): StudentPaymentsState => {
    const context = useContext(StudentPaymentsContext);
    if (!context) {
        throw new Error('useStudentPaymentsContext must be used within a StudentPaymentsProvider');
    }
    return context;
};

export const useOptionalStudentPaymentsContext = (): StudentPaymentsState | null =>
    useContext(StudentPaymentsContext);
