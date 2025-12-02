/**
 * Training Types
 * 
 * Types for the Jupyter-style training interface.
 */

export type CellType = 'code' | 'markdown' | 'output' | 'chat';
export type CellStatus = 'idle' | 'running' | 'success' | 'error';

export interface Cell {
  id: string;
  type: CellType;
  content: string;
  output?: CellOutput;
  status: CellStatus;
  createdAt: string;
  executedAt?: string;
  executionDurationMs?: number;
}

export interface CellOutput {
  type: 'text' | 'table' | 'chart' | 'error' | 'html';
  content: string;
  data?: unknown;
}

export type ModelCategory = 'classification' | 'regression' | 'clustering' | 'dimensionality_reduction' | 'custom';

export interface ModelTemplate {
  id: string;
  name: string;
  category: ModelCategory;
  description: string;
  algorithm: string;
  library: string; // sklearn, xgboost, lightgbm, etc.
  defaultParams: Record<string, {
    type: 'number' | 'string' | 'boolean' | 'select';
    label: string;
    default: unknown;
    options?: Array<{ value: string; label: string }>;
    min?: number;
    max?: number;
    step?: number;
  }>;
  codeTemplate: string; // Python code template
  icon: string;
}

export interface TrainingSession {
  id: string;
  projectId: string;
  cells: Cell[];
  selectedModel?: string;
  parameters?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Model category configuration
export const modelCategoryConfig: Record<ModelCategory, {
  label: string;
  description: string;
  icon: string;
  color: string;
}> = {
  classification: {
    label: 'Classification',
    description: 'Predict categorical labels',
    icon: 'Tags',
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/50'
  },
  regression: {
    label: 'Regression',
    description: 'Predict continuous values',
    icon: 'TrendingUp',
    color: 'text-green-600 bg-green-100 dark:bg-green-950/50'
  },
  clustering: {
    label: 'Clustering',
    description: 'Group similar data points',
    icon: 'Circle',
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-950/50'
  },
  dimensionality_reduction: {
    label: 'Dimensionality Reduction',
    description: 'Reduce feature space',
    icon: 'Minimize2',
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-950/50'
  },
  custom: {
    label: 'Custom',
    description: 'Write your own model code',
    icon: 'Code',
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-800'
  }
};

// Predefined model templates
export const MODEL_TEMPLATES: ModelTemplate[] = [
  // Classification
  {
    id: 'random_forest_classifier',
    name: 'Random Forest',
    category: 'classification',
    description: 'Ensemble of decision trees. Robust and handles non-linear relationships.',
    algorithm: 'RandomForestClassifier',
    library: 'sklearn',
    defaultParams: {
      n_estimators: {
        type: 'number',
        label: 'Number of trees',
        default: 100,
        min: 10,
        max: 500,
        step: 10
      },
      max_depth: {
        type: 'number',
        label: 'Max tree depth',
        default: 10,
        min: 1,
        max: 50
      },
      min_samples_split: {
        type: 'number',
        label: 'Min samples to split',
        default: 2,
        min: 2,
        max: 20
      }
    },
    codeTemplate: `from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Create and train model
model = RandomForestClassifier(
    n_estimators={{n_estimators}},
    max_depth={{max_depth}},
    min_samples_split={{min_samples_split}},
    random_state=42
)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
print("\\nClassification Report:")
print(classification_report(y_test, y_pred))`,
    icon: 'TreeDeciduous'
  },
  {
    id: 'xgboost_classifier',
    name: 'XGBoost',
    category: 'classification',
    description: 'Gradient boosting with high performance. Great for tabular data.',
    algorithm: 'XGBClassifier',
    library: 'xgboost',
    defaultParams: {
      n_estimators: {
        type: 'number',
        label: 'Number of boosting rounds',
        default: 100,
        min: 10,
        max: 500,
        step: 10
      },
      max_depth: {
        type: 'number',
        label: 'Max tree depth',
        default: 6,
        min: 1,
        max: 20
      },
      learning_rate: {
        type: 'number',
        label: 'Learning rate',
        default: 0.1,
        min: 0.01,
        max: 1,
        step: 0.01
      }
    },
    codeTemplate: `from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Create and train model
model = XGBClassifier(
    n_estimators={{n_estimators}},
    max_depth={{max_depth}},
    learning_rate={{learning_rate}},
    random_state=42
)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
print("\\nClassification Report:")
print(classification_report(y_test, y_pred))`,
    icon: 'Zap'
  },
  {
    id: 'logistic_regression',
    name: 'Logistic Regression',
    category: 'classification',
    description: 'Simple and interpretable. Good baseline for classification.',
    algorithm: 'LogisticRegression',
    library: 'sklearn',
    defaultParams: {
      C: {
        type: 'number',
        label: 'Regularization strength',
        default: 1.0,
        min: 0.01,
        max: 10,
        step: 0.1
      },
      max_iter: {
        type: 'number',
        label: 'Max iterations',
        default: 100,
        min: 50,
        max: 500,
        step: 50
      }
    },
    codeTemplate: `from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Create and train model
model = LogisticRegression(
    C={{C}},
    max_iter={{max_iter}},
    random_state=42
)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
print("\\nClassification Report:")
print(classification_report(y_test, y_pred))`,
    icon: 'GitBranch'
  },
  
  // Regression
  {
    id: 'random_forest_regressor',
    name: 'Random Forest',
    category: 'regression',
    description: 'Ensemble of decision trees for continuous predictions.',
    algorithm: 'RandomForestRegressor',
    library: 'sklearn',
    defaultParams: {
      n_estimators: {
        type: 'number',
        label: 'Number of trees',
        default: 100,
        min: 10,
        max: 500,
        step: 10
      },
      max_depth: {
        type: 'number',
        label: 'Max tree depth',
        default: 10,
        min: 1,
        max: 50
      }
    },
    codeTemplate: `from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Create and train model
model = RandomForestRegressor(
    n_estimators={{n_estimators}},
    max_depth={{max_depth}},
    random_state=42
)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print(f"RMSE: {mean_squared_error(y_test, y_pred, squared=False):.4f}")
print(f"R² Score: {r2_score(y_test, y_pred):.4f}")`,
    icon: 'TreeDeciduous'
  },
  {
    id: 'linear_regression',
    name: 'Linear Regression',
    category: 'regression',
    description: 'Simple, interpretable baseline for regression tasks.',
    algorithm: 'LinearRegression',
    library: 'sklearn',
    defaultParams: {},
    codeTemplate: `from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Create and train model
model = LinearRegression()
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print(f"RMSE: {mean_squared_error(y_test, y_pred, squared=False):.4f}")
print(f"R² Score: {r2_score(y_test, y_pred):.4f}")
print(f"\\nCoefficients: {model.coef_}")`,
    icon: 'TrendingUp'
  },
  
  // Clustering
  {
    id: 'kmeans',
    name: 'K-Means',
    category: 'clustering',
    description: 'Partition data into k clusters based on distance.',
    algorithm: 'KMeans',
    library: 'sklearn',
    defaultParams: {
      n_clusters: {
        type: 'number',
        label: 'Number of clusters',
        default: 3,
        min: 2,
        max: 20
      },
      max_iter: {
        type: 'number',
        label: 'Max iterations',
        default: 300,
        min: 100,
        max: 1000,
        step: 100
      }
    },
    codeTemplate: `from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

# Create and fit model
model = KMeans(
    n_clusters={{n_clusters}},
    max_iter={{max_iter}},
    random_state=42
)
labels = model.fit_predict(X)

# Evaluate
silhouette = silhouette_score(X, labels)
print(f"Number of clusters: {{n_clusters}}")
print(f"Silhouette Score: {silhouette:.4f}")
print(f"Cluster sizes: {pd.Series(labels).value_counts().to_dict()}")`,
    icon: 'Circle'
  },
  
  // Custom
  {
    id: 'custom_code',
    name: 'Custom Code',
    category: 'custom',
    description: 'Write your own model training code from scratch.',
    algorithm: 'Custom',
    library: 'custom',
    defaultParams: {},
    codeTemplate: `# Custom model training code
# Your data is available as X (features) and y (target)

# Example:
# from sklearn.svm import SVC
# model = SVC()
# model.fit(X, y)
`,
    icon: 'Code'
  }
];

// Get templates by category
export function getTemplatesByCategory(): Record<ModelCategory, ModelTemplate[]> {
  const grouped = {} as Record<ModelCategory, ModelTemplate[]>;
  
  for (const category of Object.keys(modelCategoryConfig) as ModelCategory[]) {
    grouped[category] = MODEL_TEMPLATES.filter(t => t.category === category);
  }
  
  return grouped;
}


