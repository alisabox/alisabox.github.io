import { Component, OnInit } from '@angular/core';
import { ToDo } from '../../models/models';
import { AngularFireObject } from '@angular/fire/compat/database';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from 'src/app/services/firebase.service';

@Component({
  selector: 'app-todo',
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.scss']
})
export class TodoComponent implements OnInit {
  public isDataLoading: boolean = true;
  public todos: ToDo[] = [];
  public newTodo: string = '';
  public editingMode: boolean = false;
  public showAllert: boolean = false;

  private _userId: string = '';
  private _updatedTodos: ToDo[] = [];
  private _deletingTodo: string = '';
  private _initialEditingTodoState: ToDo = {
    id: '',
    content: '',
    completed: false
  }

  public editingTodo: ToDo = this._initialEditingTodoState;

  constructor(
    private readonly _db: FirebaseService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  public ngOnInit(): void {
    const url = window.location.href;
    this._userId = url.split('/').reverse()[0];

    if (this._userId !== '') {
      this._fetchData(this._userId);
    } else {
      this._userId = this._db.createNewId();
      this.router.navigate([`${this._userId}`], { relativeTo: this.route });
    }
    this._db.dataRef$.subscribe((data) => {
      this.getUpdatedTodos(data);
    })
  }

  getInitialTodos(data: AngularFireObject<any> | undefined) {
    const fetchedData = data ? Object.values(data) : [];
    this.todos = fetchedData.filter((item) => item.id);
  }

  getUpdatedTodos(data: AngularFireObject<any> | undefined) {
    const fetchedData = data ? Object.values(data) : [];
    this._updatedTodos = fetchedData.filter((item) => item.id);
  }

  public hasConflicts() {
    if (JSON.stringify(this.todos) === JSON.stringify(this._updatedTodos)) {
      return false;
    }
    return true;
  }

  private _fetchData(userId: string) {
    this._db.fetchDataById(userId).subscribe((data) => {
      this.getInitialTodos(data);
      this.isDataLoading = false;
    });
  }

  public toggleDone(id: string): void {
    this.todos.map((item) => {
      if (item.id === id) {
        this.editingTodo = Object.assign({
          ...item,
          completed: !item.completed
        });
      }
    })

    if (this.hasConflicts()) {
      this.showAllert = true;
      return;
    }
    this.overwriteData();
  }

  public deleteItem(id: string): void {
    if (this.hasConflicts()) {
      this._deletingTodo = id;
      this.showAllert = true;
      return;
    }
    this._db.deleteToDo(this._userId, id);
    this._fetchData(this._userId);
  }

  addToDo(event: any) {
    event.preventDefault();
    if (this.hasConflicts()) {
      this.showAllert = true;
      return;
    }

    const newToDo = {
      id: '',
      content: this.newTodo,
      completed: false
    };

    this._db.addToDo(this._userId, newToDo);
    this._fetchData(this._userId);
    this.newTodo = '';
  }

  updateItem() {
    if (this.hasConflicts()) {
      this.showAllert = true;
      return;
    }
    this.overwriteData();
  }

  public loadData() {
    this._db.fetchDataById(this._userId).subscribe((data) => {
      this.getInitialTodos(data);
      this.isDataLoading = false;
    });
    this.editingMode = false;
    this.showAllert = false;
  }


  overwriteData() {
    const newTodos: ToDo[] = this.todos.map((item) => Object.assign({ ...item }));
    const index = newTodos.findIndex((item) => item.id === this.editingTodo.id);
    newTodos[index] = this.editingTodo;

    if (this.editingTodo.id === '') {
      this._db.deleteToDo(this._userId, this._deletingTodo);
      this._fetchData(this._userId);
    }
    newTodos.map((item) => {
      this._db.replaceById(this._userId, item);
    })
    this.editingTodo = this._initialEditingTodoState;
    this._fetchData(this._userId);
    this._deletingTodo = '';
    this.editingMode = false;
    this.showAllert = false;
  }


  editTodo(id: string): void {
    this.editingMode = true;

    this.todos.map((item) => {
      if (item.id === id) {
        this.editingTodo = Object.assign({
          ...item,
        });
      }
    })
  }

  closeEditing(): void {
    this.editingMode = !this.editingMode;
  }

  inputHandler(value: string): void {
    this.newTodo = value;
  }

  inputEditHandler(value: string): void {
    this.editingTodo.content = value;
  }
}
