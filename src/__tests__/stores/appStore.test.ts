import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/stores/appStore';

describe('AppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentModule: 'convert',
      showCommand: false,
      theme: 'light',
      language: 'zh-CN',
      defaultOutputPath: '',
    });
  });

  it('should have correct initial state', () => {
    const state = useAppStore.getState();
    expect(state.currentModule).toBe('convert');
    expect(state.showCommand).toBe(false);
    expect(state.theme).toBe('light');
  });

  it('should update current module', () => {
    const { setCurrentModule } = useAppStore.getState();
    setCurrentModule('edit');
    expect(useAppStore.getState().currentModule).toBe('edit');
  });

  it('should toggle showCommand', () => {
    const { toggleShowCommand } = useAppStore.getState();
    expect(useAppStore.getState().showCommand).toBe(false);
    toggleShowCommand();
    expect(useAppStore.getState().showCommand).toBe(true);
  });
});