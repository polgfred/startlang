var PEG = Npm.require('pegjs');

Plugin.registerSourceHandler('pegjs', function(compileStep) {
  try {
    var fileContents = compileStep.read().toString('utf8');
    var compiled = PEG.buildParser(fileContents, {
      output: 'source'
    });
    compiled = ECMAScript.compileForShell('export default ' + compiled);
    compileStep.addJavaScript({
      path: compileStep.inputPath + '.js',
      sourcePath: compileStep.inputPath,
      data: compiled
    });
  } catch (e) {
    compileStep.error({
      sourcePath: compileStep.inputPath,
      message: e.name + ': ' + e.message,
      line: e.line,
      column: e.column
    });
  }
});
