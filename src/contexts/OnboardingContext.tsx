import { createContext, useContext, useState, ReactNode } from 'react';

interface ClassItem {
  id: string;
  name: string;
  syllabusUploaded: boolean;
  assignments?: Assignment[];
  studyPlan?: StudyBlock[];
}

interface Assignment {
  id: string;
  name: string;
  estimatedTime: number;
  dueDate?: string;
}

interface StudyBlock {
  day: string;
  time: string;
}

interface OnboardingState {
  weekdayHours: string;
  weekendHours: string;
  classes: ClassItem[];
  currentStep: number;
}

interface OnboardingContextType {
  state: OnboardingState;
  setWeekdayHours: (hours: string) => void;
  setWeekendHours: (hours: string) => void;
  addClass: (className: string) => void;
  removeClass: (classId: string) => void;
  updateClass: (classId: string, updates: Partial<ClassItem>) => void;
  nextStep: () => void;
  goToStep: (step: number) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<OnboardingState>({
    weekdayHours: '',
    weekendHours: '',
    classes: [],
    currentStep: 0,
  });

  const setWeekdayHours = (hours: string) => {
    setState(prev => ({ ...prev, weekdayHours: hours }));
  };

  const setWeekendHours = (hours: string) => {
    setState(prev => ({ ...prev, weekendHours: hours }));
  };

  const addClass = (className: string) => {
    const newClass: ClassItem = {
      id: `${Date.now()}-${Math.random()}`,
      name: className,
      syllabusUploaded: false,
    };
    setState(prev => ({ ...prev, classes: [...prev.classes, newClass] }));
  };

  const removeClass = (classId: string) => {
    setState(prev => ({
      ...prev,
      classes: prev.classes.filter(c => c.id !== classId),
    }));
  };

  const updateClass = (classId: string, updates: Partial<ClassItem>) => {
    setState(prev => ({
      ...prev,
      classes: prev.classes.map(c =>
        c.id === classId ? { ...c, ...updates } : c
      ),
    }));
  };

  const nextStep = () => {
    setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  };

  const goToStep = (step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  return (
    <OnboardingContext.Provider
      value={{
        state,
        setWeekdayHours,
        setWeekendHours,
        addClass,
        removeClass,
        updateClass,
        nextStep,
        goToStep,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};
