import styles from './app.module.css';
import Editor from './editor.jsx';
import Graphics from './graphics.jsx';
import Header from './header.jsx';
import Inspector from './inspector.jsx';
import { useStartEnvironment } from './start-environment.js';
import Term from './term.jsx';

export default function App() {
  const env = useStartEnvironment();

  return (
    <div className={styles.app}>
      <Header
        outputTab={env.outputTab}
        setOutputTab={env.setOutputTab}
        hasGraphicsOutput={env.hasGraphicsOutput}
        hasTextOutput={env.hasTextOutput}
        isProgramActive={env.isRunDisabled}
        showInspector={env.showInspector}
        setShowInspector={env.setShowInspector}
        runExample={env.runProgram}
        runProgram={env.runOrResume}
        runLabel={env.runLabel}
        stopProgram={env.stopProgram}
        isStopDisabled={env.isStopDisabled}
      />
      <main className={styles.body}>
        <div className={styles.main}>
          <section className={styles.pane}>
            <div className={styles.panel}>
              <Editor
                runProgram={env.runOrResume}
                isReadOnly={env.isEditorReadOnly}
                layoutSignal={env.showInspector}
              />
            </div>
          </section>
          <section className={styles.pane}>
            <div
              className={`${styles.panel} ${
                env.outputTab === 'text'
                  ? styles.scrollPanel
                  : styles.hiddenPanel
              }`}
            >
              {env.outputTab === 'graphics' && (
                <Graphics shapes={env.host.getInProgressShapes()} />
              )}
              {env.outputTab === 'text' && (
                <Term
                  outputCells={env.host.getInProgressCells()}
                  inputState={env.inputState}
                />
              )}
            </div>
          </section>
        </div>
        {env.showInspector && (
          <section className={styles.inspectorPane}>
            <div className={`${styles.panel} ${styles.hiddenPanel}`}>
              <Inspector
                error={env.error}
                history={env.history}
                interpreter={env.interpreter}
                runtimeVersion={env.runtimeVersion}
                canEditValues={env.canEditInspectorValues}
                onValueChange={env.updateInspectorValue}
                onValueDelete={env.deleteInspectorValue}
                updateSlider={env.updateSlider}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
