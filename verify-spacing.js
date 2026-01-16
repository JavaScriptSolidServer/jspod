#!/usr/bin/env node

// Verify the exact spacing in the banner

const lines = [
  { leading: '                  ', content: '██╗███████╗██████╗  ██████╗ ██████╗ ', trailing: '             ' },  // Line 84
  { leading: '                  ', content: '██║██╔════╝██╔══██╗██╔═══██╗██╔══██╗', trailing: '             ' },  // Line 85
  { leading: '                  ', content: '██║███████╗██████╔╝██║   ██║██║  ██║', trailing: '             ' },  // Line 86
  { leading: '             ', content: '██   ██║╚════██║██╔═══╝ ██║   ██║██║  ██║', trailing: '             ' },  // Line 87
  { leading: '             ', content: '╚█████╔╝███████║██║     ╚██████╔╝██████╔╝', trailing: '             ' },  // Line 88
  { leading: '              ', content: ' ╚════╝ ╚══════╝╚═╝      ╚═════╝ ╚═════╝ ', trailing: '             ' },  // Line 89
];

console.log('Verifying banner spacing:\n');
lines.forEach((line, i) => {
  const lineNum = 84 + i;
  const total = line.leading.length + line.content.length + line.trailing.length;
  const status = total === 67 ? '✓' : '✗';
  console.log(`Line ${lineNum}: ${line.leading.length} + ${line.content.length} + ${line.trailing.length} = ${total} ${status}`);
});
