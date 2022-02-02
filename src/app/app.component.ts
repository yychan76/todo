import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { v4 as uuidv4 } from 'uuid';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { OkDialogComponent } from './components/ok-dialog/ok-dialog.component';
import { Todo } from './Todo';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map, Observable } from 'rxjs';
import { MatDatepicker } from '@angular/material/datepicker';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'Workshop23 - Todo App';
  form: FormGroup;
  tomorrow = new Date();
  todoValues: Todo[] = [];
  beforeHideTodoValues: Todo[] = [];
  priorities = ['low', 'normal', 'high'];
  priorityColors = new Map([
    ['low', 'skyblue'],
    ['normal', 'orange'],
    ['high', 'tomato'],
  ]);
  editTodoId: string | undefined;
  showUpdateButton: boolean = false;
  sortBy: string = '';
  sortDirection: string = '';
  sortDirectionAsc: boolean = true;
  priorityHide: string[] = [];

  // observes if the breakpoint matches the Handset size inside the Breakpoints
  // https://stackoverflow.com/questions/47477601/how-to-change-the-touchui-property-on-mat-datepicker-in-angular-material
  isHandset$: Observable<boolean> = this.breakpointObserver
    .observe(Breakpoints.Handset)
    .pipe(map((result) => result.matches));

  taskFormControl = new FormControl('', [Validators.required]);
  priorityFormControl = new FormControl('', [Validators.required]);
  dueDateFormControl = new FormControl('', [Validators.required]);
  // don't use form control for the priority hide and sort toggle buttons as form submit will reset them

  // constructor only runs once when the application is started
  // ngOnInit will be called each time the page is refreshed, for showing of date retrieved
  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private breakpointObserver: BreakpointObserver,
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer
  ) {
    this.tomorrow.setDate(this.tomorrow.getDate() + 1);
    this.form = this.fb.group({
      task: this.taskFormControl,
      priority: this.priorityFormControl,
      dueDate: this.dueDateFormControl,
    });

    // https://www.digitalocean.com/community/tutorials/angular-custom-svg-icons-angular-material
    this.matIconRegistry.addSvgIcon(
      'logo',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/logo.svg')
    );
  }

  ngOnInit(): void {
    // populate the previously saved todo list from local storage
    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i) as string;
      let value = localStorage.getItem(key) as string;
      this.todoValues.push(JSON.parse(value));
    }
  }

  addTodo() {
    let taskId = uuidv4();
    let singleTodo = new Todo(
      this.form.value.task,
      this.form.value.priority,
      this.form.value.dueDate,
      taskId
    );
    this.todoValues.push(singleTodo);
    localStorage.setItem(taskId, JSON.stringify(singleTodo));
    this.resetForm();
    // if user decided to save the editing task as new task, hide the update button
    this.showUpdateButton = false;
  }

  updateTodo() {
    if (this.editTodoId) {
      const modifyTodo = this.todoValues.find(
        (todo) => todo.taskId == this.editTodoId
      );
      if (modifyTodo) {
        modifyTodo.task = this.form.value.task;
        modifyTodo.priority = this.form.value.priority;
        modifyTodo.dueDate = this.form.value.dueDate;
        // if completed, show the delete and edit buttons
        modifyTodo.showCardButtons = modifyTodo.completed;
        // update the local storage
        localStorage.setItem(this.editTodoId, JSON.stringify(modifyTodo));
        this.resetForm();
        this.showUpdateButton = false;
      }
    }
  }

  resetForm() {
    this.taskFormControl.reset();
    this.priorityFormControl.reset();
    this.dueDateFormControl.reset();
    // also we resetForm on the formDirective inside the template to reset the validators
  }

  markDone(todo: Todo, completed: boolean) {
    todo.completed = completed;

    // if completed show the edit and delete buttons
    todo.showCardButtons = completed;

    // save the completed todo back to local storage and override existing id
    localStorage.setItem(todo.taskId, JSON.stringify(todo));
  }

  getDoneStyle(todo: Todo, priorityLabel?: boolean) {
    // if this is for the priority label we set the color, otherwise don't set it
    let textColor = priorityLabel
      ? this.priorityColors.get(todo.priority)
      : null;
    return {
      'text-decoration': todo.completed ? 'line-through' : 'none',
      color: todo.completed ? 'silver' : textColor,
    };
  }

  editTodo(todo: Todo) {
    // store the taskId in this component's editTodoId property
    this.editTodoId = todo.taskId;
    // enable the update button
    this.showUpdateButton = true;
    this.taskFormControl.setValue(todo.task);
    this.priorityFormControl.setValue(todo.priority);
    this.dueDateFormControl.setValue(todo.dueDate);
  }

  deleteTodo(todo: Todo) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm Delete: ' + todo.task,
        content: 'Are you sure you want to delete this todo?',
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.todoValues = this.todoValues.filter(
          (t) => t.taskId != todo.taskId
        );
        localStorage.removeItem(todo.taskId);
      }
    });
  }

  openAboutDialog() {
    this.dialog.open(OkDialogComponent, {
      data: {
        title: 'About this app',
        content: `This simple app stores the list of todos inside your device's browser app's
          local storage and is not synced across devices or browsers.`,
      },
    });
  }

  priorityChanged(picker: MatDatepicker<any>) {
    // if the date picker is empty open it, otherwise trigger the validators on it
    this.dueDateFormControl.hasError('required')
      ? picker.open()
      : this.dueDateFormControl.markAsTouched();
  }

  hidePriorities() {
    // console.log(this.form.value.priorityHide);
    // if we had previously saved a backup of the array before hiding, restore the backup
    if (this.beforeHideTodoValues.length) {
      this.todoValues = this.beforeHideTodoValues.slice();
    }
    // save a backup of the array
    this.beforeHideTodoValues = this.todoValues.slice();
    this.todoValues = this.todoValues.filter(
      (item) => !this.priorityHide.includes(item.priority)
    );
    this.sort();
  }

  getPriorityTodos(priority: string) {
    return this.beforeHideTodoValues.filter(
      (item) => item.priority == priority
    );
  }

  sort() {
    console.log('sort:', this.sortBy, this.sortDirection);
    switch (this.sortBy) {
      case 'priority':
        this.todoValues.sort(
          (a, b) =>
            this.priorities.indexOf(a.priority) -
            this.priorities.indexOf(b.priority)
        );
        break;
      case 'due_date':
        this.todoValues.sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );
        break;
      case 'alpha':
        this.todoValues.sort((a, b) => a.task.localeCompare(b.task));
        break;
    }
    if (!this.sortDirectionAsc) {
      this.todoValues.reverse();
    }
  }

  toggleSortDirection() {
    this.sortDirectionAsc = this.sortDirection == 'asc';
    console.log(
      'toggleSortDirection:',
      this.sortDirectionAsc,
      this.sortDirection
    );
    this.sort();
  }

  showHideAllWarning() {
    // returns true if all the todos are hidden by priority
    // console.log('showHideAllWarning:', this.priorityHide);
    if (this.beforeHideTodoValues) {
      return (
        this.beforeHideTodoValues.length > 0 &&
        this.priorities.length == this.priorityHide.length
      );
    }
    return false;
  }

  showHideWarning() {
    // returns true if some of the todos are hidden by priority
    // console.log('showHideWarning:', this.priorityHide);
    if (this.beforeHideTodoValues) {
      return (
        this.beforeHideTodoValues.length > 0 &&
        this.beforeHideTodoValues.length != this.todoValues.length &&
        this.priorities.length != this.priorityHide.length
      );
    }
    return false;
  }

  getPrioritiesWithHiddenTodos() {
    return this.priorityHide.filter((p) => {
      return this.getPriorityTodos(p).length > 0;
    });
  }
}
