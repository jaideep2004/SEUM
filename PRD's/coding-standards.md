\# SEUM Coding Standards

Version: 1.0



\## Tech Stack



Frontend



\- Next.js App Router

\- TypeScript

\- Custom CSS Modules

\- CSS Variables



UI Library



\- Custom CSS first

\- MUI only when necessary



Allowed MUI



\- DataGrid

\- Date Picker

\- Dialog

\- Autocomplete

\- Complex enterprise controls



Do not use MUI styling system.



\---



\# Code Principles



Write code that is



\- Modular

\- Typed

\- Reusable

\- Predictable

\- Maintainable

\- Production-ready



Never optimize for shortcuts.



\---



\# Folder Structure



app/



components/



features/



hooks/



services/



lib/



types/



utils/



constants/



styles/



contexts/



Keep responsibilities separated.



\---



\# Components



Components should



\- Have one responsibility

\- Be reusable

\- Stay under \~300 lines

\- Receive typed props



Move business logic into services or hooks.



\---



\# Styling



Use



\- CSS Modules

\- Global CSS

\- CSS Variables



Never use



\- Tailwind

\- Bootstrap

\- Inline styles

\- styled-components

\- Emotion



\---



\# State Management



Prefer



Server Components



React Query



Context



Avoid unnecessary global state.



\---



\# Naming



Components



PascalCase



Variables



camelCase



Constants



UPPER\_CASE



Files



kebab-case



Use descriptive names.



\---



\# Data Fetching



Prefer Server Components.



Use Client Components only when required.



Support loading and error states.



Avoid duplicate API calls.



\---



\# Forms



React Hook Form



Zod validation



Validate client and server.



\---



\# Performance



Use



\- Lazy loading

\- Dynamic imports

\- Pagination

\- Image optimization

\- Memoization where useful



Avoid unnecessary renders.



\---



\# Error Handling



Handle expected failures.



Show readable messages.



Never expose internal errors.



\---



\# Code Quality



Strict TypeScript



ESLint



Prettier



No warnings



No unused code



No dead components



Avoid "any".



\---



\# Reuse



Never duplicate



Components



Hooks



Services



Utilities



Search before creating new code.



\---



\# Accessibility



Keyboard navigation



ARIA where needed



Visible focus



Readable forms



\---



\# General Rules



Consistency over cleverness.



Readable code over short code.



Production-ready only.



Follow existing project patterns before creating new ones.


---



\# Analysis Before Implementation



Always analyze before writing code.



Never assume APIs, libraries, database schemas, business logic, component behavior, or project architecture.



Before implementing any feature:



1\. Check the official documentation for the framework, library, or API.

2\. Study the existing project structure and follow established patterns.

3\. Review existing components, hooks, services, and utilities before creating new ones.

4\. Read Graphite/Graphify reports, architecture documents, PRDs, and project documentation when available.

5\. Search the codebase for similar implementations and reuse them whenever possible.

6\. Verify assumptions with actual code instead of guessing.



If information is missing or ambiguous:



\- Do not invent behavior.

\- Do not fabricate APIs.

\- Do not create fictional database fields.

\- Do not guess business logic.

\- Ask for clarification or clearly mark assumptions before implementation.



Golden Rule:



\*\*Analyze → Verify → Plan → Implement\*\*



Never



\- Assume

\- Guess

\- Hallucinate

\- Ignore existing project patterns

\- Reinvent existing solutions

