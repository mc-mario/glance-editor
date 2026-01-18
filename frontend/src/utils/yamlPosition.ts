/**
 * Utilities for finding positions in YAML content
 */

interface WidgetLocation {
  pageIndex: number;
  columnIndex: number;
  widgetIndex: number;
  line: number;
}

/**
 * Find the line number of a widget in YAML content
 * This is a heuristic approach that walks through the YAML structure
 * to find the approximate line where a widget is defined.
 */
export function findWidgetLine(
  yamlContent: string,
  pageIndex: number,
  columnIndex: number,
  widgetIndex: number
): number | null {
  const lines = yamlContent.split('\n');
  
  let currentPage = -1;
  let currentColumn = -1;
  let currentWidget = -1;
  let inPages = false;
  let inColumns = false;
  let inWidgets = false;
  
  // Track indentation levels
  let pagesIndent = -1;
  let columnsIndent = -1;
  let widgetsIndent = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Check for pages: section
    if (trimmed.startsWith('pages:')) {
      inPages = true;
      pagesIndent = indent;
      continue;
    }
    
    // If we're in pages section
    if (inPages && indent > pagesIndent) {
      // Check for page entry (list item)
      if (trimmed.startsWith('- ') && !inColumns && !inWidgets) {
        // Reset column/widget tracking for new page
        currentPage++;
        currentColumn = -1;
        currentWidget = -1;
        inColumns = false;
        inWidgets = false;
        columnsIndent = -1;
        widgetsIndent = -1;
        continue;
      }
      
      // Check for columns: section within current page
      if (trimmed.startsWith('columns:') && currentPage === pageIndex) {
        inColumns = true;
        columnsIndent = indent;
        continue;
      }
      
      // If we're in columns section of the target page
      if (inColumns && currentPage === pageIndex && indent > columnsIndent) {
        // Check for column entry (list item)
        if (trimmed.startsWith('- ') && !inWidgets) {
          currentColumn++;
          currentWidget = -1;
          inWidgets = false;
          widgetsIndent = -1;
          continue;
        }
        
        // Check for widgets: section within current column
        if (trimmed.startsWith('widgets:') && currentColumn === columnIndex) {
          inWidgets = true;
          widgetsIndent = indent;
          continue;
        }
        
        // If we're in widgets section of the target column
        if (inWidgets && currentColumn === columnIndex && indent > widgetsIndent) {
          // Check for widget entry (list item)
          if (trimmed.startsWith('- ')) {
            currentWidget++;
            
            // Found our target widget
            if (currentWidget === widgetIndex) {
              return i + 1; // Lines are 1-indexed
            }
          }
        }
      }
    }
    
    // Reset if we've exited the pages section
    if (inPages && indent <= pagesIndent && !trimmed.startsWith('-')) {
      inPages = false;
    }
  }
  
  return null;
}

/**
 * Find all widget locations in YAML content
 */
export function findAllWidgetLocations(yamlContent: string): WidgetLocation[] {
  const locations: WidgetLocation[] = [];
  const lines = yamlContent.split('\n');
  
  let currentPage = -1;
  let currentColumn = -1;
  let currentWidget = -1;
  let inPages = false;
  let inColumns = false;
  let inWidgets = false;
  
  let pagesIndent = -1;
  let columnsIndent = -1;
  let widgetsIndent = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;
    
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    if (trimmed.startsWith('pages:')) {
      inPages = true;
      pagesIndent = indent;
      continue;
    }
    
    if (inPages && indent > pagesIndent) {
      if (trimmed.startsWith('- ') && !inColumns && !inWidgets) {
        currentPage++;
        currentColumn = -1;
        currentWidget = -1;
        inColumns = false;
        inWidgets = false;
        columnsIndent = -1;
        widgetsIndent = -1;
        continue;
      }
      
      if (trimmed.startsWith('columns:')) {
        inColumns = true;
        columnsIndent = indent;
        continue;
      }
      
      if (inColumns && indent > columnsIndent) {
        if (trimmed.startsWith('- ') && !inWidgets) {
          currentColumn++;
          currentWidget = -1;
          inWidgets = false;
          widgetsIndent = -1;
          continue;
        }
        
        if (trimmed.startsWith('widgets:')) {
          inWidgets = true;
          widgetsIndent = indent;
          continue;
        }
        
        if (inWidgets && indent > widgetsIndent) {
          if (trimmed.startsWith('- ')) {
            currentWidget++;
            locations.push({
              pageIndex: currentPage,
              columnIndex: currentColumn,
              widgetIndex: currentWidget,
              line: i + 1,
            });
          }
        }
      }
    }
    
    if (inPages && indent <= pagesIndent && !trimmed.startsWith('-')) {
      inPages = false;
    }
  }
  
  return locations;
}
