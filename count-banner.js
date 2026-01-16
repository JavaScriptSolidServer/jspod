#!/usr/bin/env node

// Count characters in the new banner lines

const lines = [
  '                                                                   ', // Line 83 (empty)
  '                      ██╗███████╗███████╗██████╗                   ', // Line 84
  '                      ██║██╔════╝██╔════╝██╔══██╗                  ', // Line 85
  '                      ██║███████╗███████╗██║  ██║                  ', // Line 86
  '                 ██   ██║╚════██║╚════██║██║  ██║                  ', // Line 87
  '                 ╚█████╔╝███████║███████║██████╔╝                  ', // Line 88
  '                  ╚════╝ ╚══════╝╚══════╝╚═════╝                   ', // Line 89
  '                                                                   ', // Line 90 (empty)
  '                  JavaScript Solid Pod                       ', // Line 91 (NEW)
  '                  Batteries included, just works                   ', // Line 92
  '                                                                   ', // Line 93 (empty)
];

console.log('Banner line lengths:\n');
lines.forEach((line, i) => {
  const lineNum = 83 + i;
  console.log(`Line ${lineNum}: ${line.length} chars | "${line}"`);
});

// Check the text content lengths
console.log('\nText content only:');
console.log(`"JavaScript Solid Pod" = ${'JavaScript Solid Pod'.length} chars`);
console.log(`"Batteries included, just works" = ${'Batteries included, just works'.length} chars`);
