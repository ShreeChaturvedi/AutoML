A well-structured GitLab issue template for a machine learning (ML) project should capture both the technical and research-driven nature of the work, while fitting within your team’s development workflow. Here's a solid template you can adapt:

---

## 🧠 ML Project Issue Template

**Issue Type**  
> _Select all that apply:_  
- [ ] Data Collection / Labeling  
- [ ] Data Preprocessing  
- [ ] Model Design / Research  
- [ ] Model Training  
- [ ] Evaluation / Metrics  
- [ ] Deployment  
- [ ] Bug / Error  
- [ ] Refactor / Optimization  
- [ ] Experiment Tracking  
- [ ] Documentation  
- [ ] Other: `________`

---

### 🎯 Objective

> _What is the goal of this task or issue?_  
_Example: Train a binary classifier to distinguish spam emails._

---

### 📊 Success Criteria

> _How will we measure success?_  
_Example: Achieve ≥ 90% F1 score on validation set._

---

### 📂 Inputs

- **Datasets**:  
  _List sources, versions, and access paths._  
- **Code / Notebooks**:  
  _Link to any relevant scripts, repos, or prior work._  
- **Baseline / References**:  
  _Cite papers, models, or past experiments for context._

---

### 🧪 Method / Approach

> _Brief description of planned method, architecture, or experiment._  
_Example: Fine-tune BERT on labeled dataset using HuggingFace Transformers._

---

### ⚙️ Tasks

- [ ] Break work into subtasks as needed  
  - [ ] Data prep  
  - [ ] Model setup  
  - [ ] Training script  
  - [ ] Evaluation  
  - [ ] Report generation  

---

### 📝 Notes / Comments

> _Any risks, open questions, or decision points?_  
_Example: Need to decide between weighted loss vs. oversampling for class imbalance._

---

### 📅 Timeline / Milestones

> _Estimated start, checkpoints, and deadline._

---

### 🔗 Related Issues / MRs

> _Link to any related work or dependencies._

---

You can add this to GitLab via **Settings > Issue Templates** or keep it in a central `.gitlab/issue_templates/` directory in your repo.
