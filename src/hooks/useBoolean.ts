import { useState, useCallback } from 'react';

interface UseBooleanReturn {
    value: boolean;
    setValue: (value: boolean) => void;
    setTrue: () => void;
    setFalse: () => void;
    toggle: () => void;
}

/**
 * Custom hook for managing boolean state with convenient helper functions
 * @param initialValue - The initial boolean value (default: false)
 * @returns Object with value and helper functions to manipulate the boolean state
 */
export const useBoolean = (initialValue: boolean = false): UseBooleanReturn => {
    const [value, setValue] = useState<boolean>(initialValue);

    const setTrue = useCallback(() => {
        setValue(true);
    }, []);

    const setFalse = useCallback(() => {
        setValue(false);
    }, []);

    const toggle = useCallback(() => {
        setValue(prev => !prev);
    }, []);

    return {
        value,
        setValue,
        setTrue,
        setFalse,
        toggle,
    };
};
