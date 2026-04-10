import { createContext, useContext, useReducer } from 'react';

const GraphContext = createContext(null);

const initialState = {
  persons: { loading: false, data: [], error: null },
  relationships: { loading: false, data: [], error: null },
  pendingEntities: { loading: false, data: [], error: null },
};

function graphReducer(state, action) {
  switch (action.type) {
    case 'SET_PERSONS':
      return { ...state, persons: { loading: false, data: action.payload, error: null } };
    case 'SET_RELATIONSHIPS':
      return { ...state, relationships: { loading: false, data: action.payload, error: null } };
    case 'ADD_PENDING_PERSON':
      return {
        ...state,
        pendingEntities: {
          ...state.pendingEntities,
          data: [...state.pendingEntities.data, action.payload],
        },
      };
    case 'APPROVE_CONTRIBUTION':
      return {
        ...state,
        pendingEntities: {
          ...state.pendingEntities,
          data: state.pendingEntities.data.filter((e) => e.id !== action.payload.id),
        },
        persons: {
          ...state.persons,
          data: [...state.persons.data, action.payload],
        },
      };
    case 'SET_LOADING':
      return {
        ...state,
        [action.resource]: { ...state[action.resource], loading: true },
      };
    case 'SET_ERROR':
      return {
        ...state,
        [action.resource]: { ...state[action.resource], loading: false, error: action.payload },
      };
    default:
      return state;
  }
}

export function GraphProvider({ children }) {
  const [state, dispatch] = useReducer(graphReducer, initialState);

  return (
    <GraphContext.Provider value={{ ...state, dispatch }}>
      {children}
    </GraphContext.Provider>
  );
}

export function useGraph() {
  const context = useContext(GraphContext);
  if (!context) throw new Error('useGraph must be used within GraphProvider');
  return context;
}
