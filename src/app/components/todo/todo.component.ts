import { Component, OnInit } from '@angular/core';
import { ToDo } from '../../models/models';
import { AngularFireDatabase, AngularFireObject } from '@angular/fire/compat/database';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-todo',
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.scss']
})
export class TodoComponent implements OnInit {

  isDataLoading: boolean = true; // Показывает лоадер пока данные не загружены

  userId: string = ''; // Переменная,  хранящая айди пользователя

  todos: ToDo[] = []; // переменная, в которой хранятся данные, полученные при загрузке
  updatedTodos: ToDo[] = []; // перменная, в которой хранятся данные

  newTodo: string = '';
  deletingTodo: string = '';

  initialEditingTodoState: ToDo = {
    id: '',
    content: '',
    completed: false
  }

  editingTodo: ToDo = this.initialEditingTodoState;

  editingMode: boolean = false;

  showAllert: boolean = false;

  constructor(
    private db: AngularFireDatabase,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const url = window.location.href;
    this.userId = url.split('/').reverse()[0];
    if (this.userId !== '') {
      this.db.database.ref(`users/${this.userId}`).once('value', (snapshot) => {
        if (snapshot.exists()) {
          this.fetchData();
        } else {
          this.router.navigate([`not-found`]);
        }
      });
    } else {
      this.userId = this.db.database.ref().child(`users`).push().key || '';
      this.db.database.ref().child(`users/${this.userId}`).push('placeholder');
      this.router.navigate([`${this.userId}`], { relativeTo: this.route });
      this.fetchData();
    }
  } // При загрузке проверяется путь, по которому зашел пользователь.
  // Если корень, то создается новый айди пользователя, и он перенаправляется на выделенный адрес
  // Если в пути указан несуществующий айди, то пользователь перенаправляется на страницу "не найдено"
  // Если в пути указан существующий айди, то загружаются данные по этому айди

  fetchData() {
    this.db.database.ref(`users/${this.userId}`).once('value', (snapshot) => {
      this.getInitialTodos(snapshot.val());
      this.isDataLoading = false;
    });
    this.db.database.ref(`users/${this.userId}`).on('value', (snapshot) => {
      this.getUpdatedTodos(snapshot.val());
    });
  } // Загрузка данных и отдельно подписка на изменения

  getInitialTodos(data: AngularFireObject<any> | undefined) {
    const fetchedData = data ? Object.values(data) : [];
    this.todos = fetchedData.filter((item) => item.id);
  }

  getUpdatedTodos(data: AngularFireObject<any> | undefined) {
    const fetchedData = data ? Object.values(data) : [];
    this.updatedTodos = fetchedData.filter((item) => item.id);
  }

  hasConflicts() {
    if (JSON.stringify(this.todos) === JSON.stringify(this.updatedTodos)) {
      return false;
    }
    return true;
  } // Проверка на соответствие отображенных данных с актуальными данными с сервера

  // Далее - функции CRUD операций с данными

  toggleDone (id: string): void {
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

  deleteItem (id: string): void {
    if (this.hasConflicts()) {
      this.deletingTodo = id;
      this.showAllert = true;
      return;
    }
    this.db.database.ref(`users/${this.userId}`).child(id).remove();
    this.fetchData();
  }

  addToDo (event: any) {
    event.preventDefault();
    if (this.hasConflicts()) {
      this.showAllert = true;
      return;
    }
    const newKey = this.db.database.ref().child(`users/${this.userId}`).push().key;
    if (newKey) {
      this.db.database.ref(`users/${this.userId}`).child(newKey).set({
        id: newKey,
        content: this.newTodo,
        completed: false
      }).then(() => {
        this.newTodo = '';
        this.fetchData();
      });
    }
  }

  updateItem () {
    if (this.hasConflicts()) {
      this.showAllert = true;
      return;
    }
    this.overwriteData();
  }

  // Загрузка свежих данных, если пользователь решил применить изменения других пользователей

  loadData() {
    this.fetchData();
    this.editingMode = false;
    this.showAllert = false;
  }

  // Перезапись данных сервера данными пользователя

  overwriteData() {
    const newTodos: ToDo[] = this.todos.map((item) => Object.assign({...item}));
    const index = newTodos.findIndex((item) => item.id === this.editingTodo.id);
    newTodos[index] = this.editingTodo;

    if (this.editingTodo.id === '') {
      this.db.database.ref(`users/${this.userId}`).child(this.deletingTodo).remove().then(() => {
        this.deletingTodo = '';
        this.fetchData();
      })
    }
    newTodos.map((item) => {
      this.db.database.ref(`users/${this.userId}/${item.id}`).set(item).then(() => {
        this.editingTodo = this.initialEditingTodoState;
        this.fetchData();
        this.deletingTodo = '';
        this.editingMode = false;
        this.showAllert = false;
      })
    })
  }

  // Хэндлеры инпутов, открытия и закрытия формы редактирования

  editTodo (id: string): void {
    this.editingMode = true;

    this.todos.map((item) => {
      if (item.id === id) {
        this.editingTodo = Object.assign({
          ...item,
        });
      }
    })
  }

  closeEditing (): void {
    this.editingMode = !this.editingMode;
  }

  inputHandler (value: string): void {
    this.newTodo = value;
  }

  inputEditHandler (value: string): void {
    this.editingTodo.content = value;
  }
}
