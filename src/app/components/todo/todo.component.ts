import { Component, OnDestroy, OnInit } from '@angular/core';
import { ToDo } from '../../models/models';
import { AngularFireObject } from '@angular/fire/compat/database';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from 'src/app/services/firebase.service';
import { ReplaySubject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-todo',
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.scss']
})
export class TodoComponent implements OnInit, OnDestroy {
  public isDataLoading: boolean = true;
  public todos: ToDo[] = [];
  public newTodo: string = '';
  public editingMode: boolean = false;
  public showAllert: boolean = false;

  private _destoy$: ReplaySubject<boolean> = new ReplaySubject();
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
    this._db.dataRef$
      .pipe(takeUntil(this._destoy$))
      .subscribe((data) => {
        this._getUpdatedTodos(data);
      })
  }

  public ngOnDestroy(): void {
    this._destoy$.next(true);
    this._destoy$.complete();
  }

  public hasConflicts(): boolean {
    if (JSON.stringify(this.todos) === JSON.stringify(this._updatedTodos)) {
      return false;
    }
    return true;
  }

  private _fetchData(userId: string): void {
    this._db.fetchDataById(userId)
      .pipe(takeUntil(this._destoy$))
      .subscribe((data) => {
        this._getInitialTodos(data);
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

  public addToDo(event: any): void {
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

  public updateItem(): void {
    if (this.hasConflicts()) {
      this.showAllert = true;
      return;
    }
    this.overwriteData();
  }

  public loadData(): void {
    this._db.fetchDataById(this._userId)
      .pipe(takeUntil(this._destoy$))
      .subscribe((data) => {
        this._getInitialTodos(data);
        this.isDataLoading = false;
      });

    this.editingMode = false;
    this.showAllert = false;
  }


  public overwriteData(): void {
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


  public editTodo(id: string): void {
    this.editingMode = true;

    this.todos.map((item) => {
      if (item.id === id) {
        this.editingTodo = Object.assign({
          ...item,
        });
      }
    })
  }

  public closeEditing(): void {
    this.editingMode = !this.editingMode;
  }

  public inputHandler(value: string): void {
    this.newTodo = value;
  }

  public inputEditHandler(value: string): void {
    this.editingTodo.content = value;
  }

  private _getInitialTodos(data: AngularFireObject<any> | undefined): void {
    const fetchedData = data ? Object.values(data) : [];
    this.todos = fetchedData.filter((item) => item.id);
  }

  private _getUpdatedTodos(data: AngularFireObject<any> | undefined): void {
    const fetchedData = data ? Object.values(data) : [];
    this._updatedTodos = fetchedData.filter((item) => item.id);
  }
}
